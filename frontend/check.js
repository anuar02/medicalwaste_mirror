const fs = require('fs');
const path = require('path');

// Function to recursively find all JS/JSX files
function findJSFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git')) {
            findJSFiles(filePath, fileList);
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

// Migration functions
function migrateUseQuery(content) {
    // Handle useQuery with array queryKey
    content = content.replace(
        /useQuery\(\s*(\[[\s\S]*?\]),\s*([\s\S]*?),\s*\{([\s\S]*?)\}\s*\)/g,
        (match, queryKey, queryFn, options) => {
            return `useQuery({\n    queryKey: ${queryKey.trim()},\n    queryFn: ${queryFn.trim()},\n    ${options.trim()}\n})`;
        }
    );

    // Handle useQuery with string queryKey
    content = content.replace(
        /useQuery\(\s*(['"`][\w\-_]+['"`]),\s*([\s\S]*?),\s*\{([\s\S]*?)\}\s*\)/g,
        (match, queryKey, queryFn, options) => {
            const arrayKey = `[${queryKey.trim()}]`;
            return `useQuery({\n    queryKey: ${arrayKey},\n    queryFn: ${queryFn.trim()},\n    ${options.trim()}\n})`;
        }
    );

    return content;
}

function migrateUseMutation(content) {
    return content.replace(
        /useMutation\(\s*([\s\S]*?),\s*\{([\s\S]*?)\}\s*\)/g,
        (match, mutationFn, options) => {
            return `useMutation({\n    mutationFn: ${mutationFn.trim()},\n    ${options.trim()}\n})`;
        }
    );
}

function migrateInvalidateQueries(content) {
    return content.replace(
        /queryClient\.invalidateQueries\((\[[\s\S]*?\])\)/g,
        'queryClient.invalidateQueries({ queryKey: $1 })'
    );
}

function migrateUseInfiniteQuery(content) {
    return content.replace(
        /useInfiniteQuery\(\s*(\[[\s\S]*?\]),\s*([\s\S]*?),\s*\{([\s\S]*?)\}\s*\)/g,
        (match, queryKey, queryFn, options) => {
            return `useInfiniteQuery({\n    queryKey: ${queryKey.trim()},\n    queryFn: ${queryFn.trim()},\n    ${options.trim()}\n})`;
        }
    );
}

// Main migration function
function migrateFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Check if file contains React Query hooks
        if (!content.includes('useQuery') && !content.includes('useMutation') && !content.includes('useInfiniteQuery')) {
            return false;
        }

        console.log(`Migrating: ${filePath}`);

        const originalContent = content;

        // Apply migrations
        content = migrateUseQuery(content);
        content = migrateUseMutation(content);
        content = migrateUseInfiniteQuery(content);
        content = migrateInvalidateQueries(content);

        // Only write if content changed
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated: ${filePath}`);
            return true;
        } else {
            console.log(`⏭️  No changes needed: ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
        return false;
    }
}

// Run migration
function runMigration() {
    const srcDir = './src'; // Adjust this path as needed

    if (!fs.existsSync(srcDir)) {
        console.error('Source directory not found. Please adjust the srcDir path in the script.');
        return;
    }

    console.log('🚀 Starting React Query v5 migration...');

    const jsFiles = findJSFiles(srcDir);
    let updatedFiles = 0;

    jsFiles.forEach(file => {
        if (migrateFile(file)) {
            updatedFiles++;
        }
    });

    console.log(`\n✨ Migration complete!`);
    console.log(`📁 Processed ${jsFiles.length} files`);
    console.log(`🔄 Updated ${updatedFiles} files`);

    if (updatedFiles > 0) {
        console.log('\n⚠️  Please review the changes and test your application!');
        console.log('💡 Consider running your tests to ensure everything works correctly.');
    }
}

// Run the migration
runMigration();