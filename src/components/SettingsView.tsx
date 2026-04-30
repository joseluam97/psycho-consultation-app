import { useState, useEffect } from 'react';
import { driveService } from '../services/driveService';
import { syncService } from '../services/syncService';
import type { SyncData } from '../types';

export const SettingsView = () => {
  const [syncData, setSyncData] = useState<SyncData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadSyncInfo();
  }, []);

  const loadSyncInfo = async () => {
    const data = await syncService.getSyncData();
    setSyncData(data);
  };

  const handleBackup = async () => {
    setIsSyncing(true);
    try {
      await driveService.uploadDatabase();
      await syncService.resetAfterSync();
      await loadSyncInfo();
      alert("✅ Sincronización completada.");
    } catch (e) {
      alert("❌ Error al sincronizar.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Configuración</h2>
      
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-blue-800 flex items-center gap-2 text-lg">
              ☁️ Sincronización con Google Drive
            </h3>
            <p className="text-sm text-blue-600 mt-1">
              Última actualización: {syncData?.last_update ? new Date(syncData.last_update).toLocaleString() : 'Nunca'}
            </p>
            <p className="text-sm text-gray-500">
              Cambios pendientes: <span className="font-bold">{syncData?.number_of_changes || 0}</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleBackup}
              disabled={isSyncing}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
            >
              {isSyncing ? 'Sincronizando...' : '☁️ Forzar Sincronización'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};