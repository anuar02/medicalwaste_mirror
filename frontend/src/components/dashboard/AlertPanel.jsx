const AlertPanel = ({ alerts }) => {
    if (!alerts || alerts.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg border-l-4 border-red-500 bg-red-50 p-4"
        >
            <div className="flex items-center">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                        Внимание! {alerts.length} контейнер(ов) требуют немедленного вмешательства
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc space-y-1 pl-5">
                            {alerts.slice(0, 3).map((alert, index) => (
                                <li key={index}>
                                    {alert.location || alert.department} - {Math.round(alert.currentLevel)}% заполнен
                                </li>
                            ))}
                            {alerts.length > 3 && (
                                <li>И еще {alerts.length - 3} контейнер(ов)...</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};