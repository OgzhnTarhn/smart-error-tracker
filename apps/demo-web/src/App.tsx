import { useState } from 'react';
import { captureException, captureMessage } from '../../../packages/sdk-browser/src/index';

export default function App() {
    const [log, setLog] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setLog(prev => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev].slice(0, 20));
    };

    const handleThrowError = () => {
        addLog('🔴 Throwing unhandled error...');
        setTimeout(() => {
            throw new Error('Demo crash: Unhandled runtime error');
        }, 0);
    };

    const handleUnhandledReject = () => {
        addLog('🟡 Creating unhandled promise rejection...');
        Promise.reject(new Error('Demo reject: Unhandled promise rejection'));
    };

    const handleManualCapture = () => {
        addLog('🔵 Manual captureException...');
        try {
            // Simulate a caught error
            const obj: any = null;
            obj.someMethod();
        } catch (err) {
            captureException(err, { action: 'manual-demo-button', customField: 42 });
            addLog('✅ captureException sent!');
        }
    };

    const handleCaptureMessage = () => {
        addLog('💬 Manual captureMessage...');
        captureMessage('User clicked the demo button', {
            level: 'info',
            extras: { page: 'demo', buttonId: 'capture-message' },
        });
        addLog('✅ captureMessage sent!');
    };

    const env = import.meta.env.VITE_ENVIRONMENT || 'dev';
    const release = import.meta.env.VITE_RELEASE || '0.0.0';
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                        Smart Error Tracker
                    </h1>
                    <p className="text-slate-400 text-lg">Browser SDK Demo</p>
                    <div className="flex justify-center gap-3 mt-4 text-xs">
                        <span className="px-2.5 py-1 bg-violet-500/20 text-violet-400 rounded-full border border-violet-500/30">{env}</span>
                        <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 font-mono">{release}</span>
                        <span className="px-2.5 py-1 bg-slate-700 text-slate-400 rounded-full font-mono">{baseUrl}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <button
                        onClick={handleThrowError}
                        className="group relative px-6 py-4 bg-red-500/10 border border-red-500/30 rounded-2xl hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-200"
                    >
                        <div className="text-red-400 font-semibold text-lg mb-1">💥 Throw Error</div>
                        <div className="text-red-300/60 text-sm">Triggers window.onerror</div>
                    </button>

                    <button
                        onClick={handleUnhandledReject}
                        className="group relative px-6 py-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-200"
                    >
                        <div className="text-amber-400 font-semibold text-lg mb-1">⚡ Unhandled Reject</div>
                        <div className="text-amber-300/60 text-sm">Triggers unhandledrejection</div>
                    </button>

                    <button
                        onClick={handleManualCapture}
                        className="group relative px-6 py-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl hover:bg-blue-500/20 hover:border-blue-500/50 transition-all duration-200"
                    >
                        <div className="text-blue-400 font-semibold text-lg mb-1">🎯 Manual Capture</div>
                        <div className="text-blue-300/60 text-sm">captureException(err)</div>
                    </button>

                    <button
                        onClick={handleCaptureMessage}
                        className="group relative px-6 py-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all duration-200"
                    >
                        <div className="text-emerald-400 font-semibold text-lg mb-1">💬 Capture Message</div>
                        <div className="text-emerald-300/60 text-sm">captureMessage(msg)</div>
                    </button>
                </div>

                {/* Event Log */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Event Log</h2>
                        <button
                            onClick={() => setLog([])}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {log.length === 0 ? (
                            <div className="px-5 py-8 text-center text-sm text-slate-500">
                                Click a button above to trigger an event...
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-700/30">
                                {log.map((entry, i) => (
                                    <li key={i} className="px-5 py-2.5 text-sm font-mono text-slate-300">{entry}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-xs text-slate-600">
                    Events are sent to <span className="text-slate-400 font-mono">{baseUrl}/events</span>
                    <br />
                    Open <a href="http://localhost:5173" target="_blank" className="text-blue-400 hover:text-blue-300 underline">Dashboard</a> to see captured issues
                </div>
            </div>
        </div>
    );
}
