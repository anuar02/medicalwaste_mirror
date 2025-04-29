module.exports = {
    apps: [{
        name: 'backend-app',
        script: 'npm',
        args: 'start',
        env: {
            NODE_ENV: 'production',
            PORT: 4000
        }
    }]
}