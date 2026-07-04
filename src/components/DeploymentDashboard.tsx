import React, { useState, useEffect } from 'react';
import { DeploymentLog, Language } from '../types';
import { GitBranch, GitCommit, RefreshCw, AlertTriangle, CheckCircle, ExternalLink, ShieldCheck, Terminal, HelpCircle } from 'lucide-react';

interface DeploymentDashboardProps {
  logs: DeploymentLog[];
  onAddLog: (log: DeploymentLog) => void;
  onRollback: (targetHash: string) => void;
  lang: Language;
}

export const DeploymentDashboard: React.FC<DeploymentDashboardProps> = ({
  logs,
  onAddLog,
  onRollback,
  lang
}) => {
  const [activeVersion, setActiveVersion] = useState('v1.2.4');
  const [activeUrl, setActiveUrl] = useState('eba-project-94112.vercel.app');
  
  // Simulation states
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [failSimulation, setFailSimulation] = useState(false);
  const [customCommit, setCustomCommit] = useState('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Auto trigger build logs simulation
  useEffect(() => {
    if (!isDeploying) return;

    let timer: any;
    if (deployStep === 1) {
      setTerminalOutput([
        'git checkout main && git pull origin main',
        'Receiving objects: 100% (24/24), 8.12 KiB | 8.12 MiB/s, done.',
        'From github.com/eba-project/eba-project-app',
        '   e6f432b..f7c9a8b  main       -> origin/main',
        'Vercel: Initializing Build Container...',
        'Vercel: Setting up Node.js v20.x environment...',
        'Vercel: Installing dependencies from package-lock.json...'
      ]);
      timer = setTimeout(() => setDeployStep(2), 2000);
    } else if (deployStep === 2) {
      setTerminalOutput(prev => [
        ...prev,
        'npm run lint',
        '✓ All components linted with no syntax warnings.',
        'npm run build',
        'vite v6.2.3 building for production...',
        '✓ 142 modules transformed.',
        'dist/index.html                  0.48 kB │ gzip:  0.31 kB',
        'dist/assets/index-D72c918b.css   24.12 kB │ gzip:  5.80 kB',
        'dist/assets/index-A41c8812.js   145.22 kB │ gzip: 42.12 kB',
        '✓ Built successfully in 1240ms.'
      ]);
      
      timer = setTimeout(() => {
        if (failSimulation) {
          setDeployStep(4); // Trigger failure
        } else {
          setDeployStep(3); // Trigger success
        }
      }, 2500);
    } else if (deployStep === 3) {
      // Success Outcome
      const newHash = Math.random().toString(16).substring(2, 9);
      const newLog: DeploymentLog = {
        id: `dep_${Date.now()}`,
        commitHash: newHash,
        commitMessage: customCommit || 'updates: optimized watermarking and offline queue syncs',
        branch: 'main',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'success',
        vercelUrl: 'eba-project-94112.vercel.app'
      };

      onAddLog(newLog);
      setActiveVersion(`v1.2.${logs.length + 1}`);
      setTerminalOutput(prev => [
        ...prev,
        'Vercel: Uploading build artifacts to Edge nodes...',
        'Vercel: Configuring HTTP redirections and security headers...',
        `Vercel: Production deploy complete! Live URL: https://${activeUrl}`,
        `SUCCESS: Deployed commit ${newHash} successfully!`
      ]);
      setIsDeploying(false);
      setCustomCommit('');
      
      // Notify
      setNotification(`Deploy Success! Version v1.2.${logs.length + 1} is now live on Vercel!`);
      setTimeout(() => setNotification(null), 5000);

    } else if (deployStep === 4) {
      // Failure Outcome
      const failHash = Math.random().toString(16).substring(2, 9);
      setTerminalOutput(prev => [
        ...prev,
        'npm run lint',
        'ERROR: Failed compilation in /src/components/ProgressPhotos.tsx (line 42):',
        '       Type mismatch: "isOffline" is declared boolean but assigned string.',
        'ELIFECYCLE: npm run build failed with exit code 1.',
        'FAILED: Build execution rejected by Vercel Compiler.'
      ]);

      const failedLog: DeploymentLog = {
        id: `dep_${Date.now()}`,
        commitHash: failHash,
        commitMessage: customCommit || 'feat: added telemetry dashboards (causes build fail)',
        branch: 'main',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'failed'
      };
      onAddLog(failedLog);

      // Trigger automatic rollback immediately
      timer = setTimeout(() => {
        setDeployStep(5); // Rollback step
      }, 2000);

    } else if (deployStep === 5) {
      // Rollback Simulation
      const lastStable = logs.find(l => l.status === 'success');
      const rollbackHash = lastStable ? lastStable.commitHash : 'e6f432b';
      
      setTerminalOutput(prev => [
        ...prev,
        '-------------------------------------------------------',
        '⚠️ ALERT: CRITICAL BUILD FAILURE DETECTED ON PRODUCTION BRANCH!',
        '⚡ AUTO-ROLLBACK SYSTEM ENGAGED.',
        `Reverting Production deployment to last certified stable commit [${rollbackHash}]...`,
        'Vercel: Deploying cached build container for stable build...',
        '✓ Restored stable endpoints.',
        'SUCCESS: Production rolled back automatically to pre-incident state.'
      ]);

      const rollbackLog: DeploymentLog = {
        id: `dep_${Date.now()}`,
        commitHash: 'rollback',
        commitMessage: `Auto-rollback: restored stable build [${rollbackHash}]`,
        branch: 'main',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'rolled_back',
        vercelUrl: 'eba-project-94112.vercel.app'
      };
      onAddLog(rollbackLog);
      setIsDeploying(false);
      setCustomCommit('');
      setNotification('Auto-Rollback Triggered: Previous stable version restored on Vercel!');
      setTimeout(() => setNotification(null), 5000);
    }

    return () => clearTimeout(timer);
  }, [isDeploying, deployStep]);

  const handleStartDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    setDeployStep(1);
  };

  const handleManualRollback = (hash: string) => {
    onRollback(hash);
    setNotification(`Manually rolled back production to commit [${hash}]`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6" id="devops-tab-content">
      
      {/* Real-time Webhook Notification Banner */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-650 text-white px-4 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500 animate-bounce" id="vercel-toast">
          <CheckCircle size={20} className="text-white animate-spin" />
          <div className="text-xs">
            <span className="font-bold">Vercel Webhook: </span>
            {notification}
          </div>
        </div>
      )}

      {/* Production Health & Integrations Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="devops-summary">
        
        {/* Connection status and production domain link */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 text-[8px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-450 rounded-full uppercase tracking-wider">
              Vercel Live
            </span>
            <h3 className="font-sans font-bold text-sm text-gray-950 dark:text-gray-100">EBA Production Cloud</h3>
            <p className="text-[11px] text-gray-400">Continuous Integration & Deployment Status</p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-gray-50 dark:border-gray-850 pb-2">
              <span className="text-gray-400">Status</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                ONLINE
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-50 dark:border-gray-850 pb-2">
              <span className="text-gray-400">Version</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{activeVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Repo</span>
              <span className="font-mono font-semibold text-gray-650 dark:text-gray-350">github/eba-project</span>
            </div>
          </div>

          <a
            href={`https://${activeUrl}`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-850 text-[11px] font-bold text-blue-600 dark:text-blue-400 border border-gray-100 dark:border-gray-800 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Visit Public URL</span>
            <ExternalLink size={12} />
          </a>
        </div>

        {/* Trigger GitHub Webhook simulation */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-sans font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <GitBranch size={14} />
                <span>Trigger Git Webhook Integration</span>
              </h3>
              <p className="text-[11px] text-gray-400">Simulate a remote code modification pushing directly to the master repository.</p>
            </div>
          </div>

          <form onSubmit={handleStartDeploy} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-gray-400 uppercase">Commit Message</label>
              <input
                type="text"
                value={customCommit}
                onChange={(e) => setCustomCommit(e.target.value)}
                placeholder="e.g. feat: add automated S-curve plan optimizer"
                disabled={isDeploying}
                className="w-full p-2.5 text-xs border rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={failSimulation}
                  onChange={(e) => setFailSimulation(e.target.checked)}
                  disabled={isDeploying}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span>Simulate Build Failure (Triggers Rollback)</span>
              </label>

              <button
                type="submit"
                disabled={isDeploying}
                className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md ${
                  isDeploying
                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                    : 'bg-orange-650 hover:bg-orange-700 text-white shadow-orange-600/15'
                }`}
              >
                <GitCommit size={14} />
                <span>{isDeploying ? 'Deploying...' : 'Push Code Change'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Compiler Terminal logs */}
      {isDeploying && (
        <div className="bg-black text-emerald-400 font-mono text-xs p-4 rounded-2xl border border-gray-800 shadow-lg space-y-2.5 animate-in slide-in-from-top-3 duration-150" id="devops-terminal">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-gray-500" />
              <span className="text-[10px] text-gray-400">Vercel Build Compiler Log</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin text-orange-500" />
              <span className="text-[9px] text-gray-500 uppercase">Compiling Assets</span>
            </div>
          </div>
          <div className="space-y-1 max-h-[160px] overflow-y-auto font-mono text-[10px]">
            {terminalOutput.map((line, idx) => (
              <div key={idx} className="leading-relaxed">
                <span className="text-gray-650 select-none mr-2">$</span>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Deployment logs table & Manual rollback */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-5 shadow-sm space-y-4" id="deployment-history">
        <div>
          <h3 className="font-sans font-bold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <ShieldCheck size={14} />
            <span>Riwayat Perubahan & Deployment</span>
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Log aktivitas detail melacak riwayat rilis. Admin bisa memicu rollback manual kapan saja.</p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-850">
          {logs.map((log) => (
            <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600 dark:text-gray-400">
                    {log.commitHash}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                    log.status === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-450' :
                    log.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-950/20 dark:text-blue-450'
                  }`}>
                    {log.status === 'success' ? 'SUCCESS' : 
                     log.status === 'failed' ? 'BUILD FAIL' : 'ROLLED BACK'}
                  </span>
                  <span className="text-[10px] text-gray-450 font-mono">{log.timestamp}</span>
                </div>
                <h5 className="font-bold text-gray-900 dark:text-white mt-1.5">{log.commitMessage}</h5>
              </div>

              {log.status === 'success' && (
                <button
                  onClick={() => handleManualRollback(log.commitHash)}
                  disabled={isDeploying}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold rounded-lg self-end sm:self-center transition-colors disabled:opacity-50"
                  id={`rollback-btn-${log.commitHash}`}
                >
                  Rollback to Here
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
