import { SocialLogin } from '@capgo/capacitor-social-login';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { DB_NAME } from '../constant';
import { Capacitor } from '@capacitor/core';

const FOLDER_NAME = 'PSICOAPP';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const driveService = {

    // Convierte Base64 a Blob en trozos pequeños para evitar que el móvil se quede sin memoria
    base64ToBlob(b64Data: string, contentType = 'application/octet-stream'): Blob {
        const sliceSize = 512;
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, { type: contentType });
    },

    async getAccessToken(): Promise<string> {
        console.log("getAccessToken INI");
        try {
            // Inicialización (Asegúrate de tener esto también en App.tsx al arrancar)
            await SocialLogin.initialize({
                google: {
                    webClientId: CLIENT_ID,
                }
            }).catch(console.error);

            const response = await SocialLogin.login({
                provider: 'google',
                options: {
                    scopes: ['profile email https://www.googleapis.com/auth/drive.file']
                }
            });

            const result = response.result as any;
            let token = result.accessToken;

            if (typeof token === 'object' && token !== null && token.token) {
                token = token.token;
            }

            if (!token || typeof token !== 'string') {
                throw new Error("El token está vacío o no es un texto");
            }

            console.log("Token de texto puro listo para Drive:", token.substring(0, 15) + "...");
            return token;
        } catch (error) {
            console.error("Error en Google Sign-In:", error);
            throw error;
        }
    },

    // 1. Obtener o Crear la carpeta PSICOAPP
    async getOrCreateFolder(token: string): Promise<string> {
        const query = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
        const response = await fetch(`${DRIVE_API}?q=${query}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.files && data.files.length > 0) {
            return data.files[0].id; 
        }

        const createResponse = await fetch(DRIVE_API, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });
        const folder = await createResponse.json();
        return folder.id;
    },

    // 2. Buscar el archivo DB dentro de esa carpeta específica
    async findFileIdInFolder(token: string, folderId: string): Promise<string | null> {
        const query = encodeURIComponent(`name='${DB_NAME}' and '${folderId}' in parents and trashed=false`);
        const response = await fetch(`${DRIVE_API}?q=${query}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        return data.files && data.files.length > 0 ? data.files[0].id : null;
    },

    // 3. SUBIR A DRIVE (En la carpeta PSICOAPP)
    async uploadDatabase(): Promise<void> {
        console.log("Iniciando proceso de subida a Google Drive...");
        const token = await this.getAccessToken();
        const folderId = await this.getOrCreateFolder(token);
        const fileId = await this.findFileIdInFolder(token, folderId);

        console.log("Calculando ruta segura de la base de datos...");
        let dbFolder = "";

        if (Capacitor.getPlatform() === 'android') {
            const dataDir = await Filesystem.getUri({ directory: Directory.Data, path: '' });
            let rawPath = dataDir.uri.replace('file://', '');
            dbFolder = rawPath.replace('/files', '/databases');
        } else {
            const libDir = await Filesystem.getUri({ directory: Directory.Library, path: '' });
            let rawPath = libDir.uri.replace('file://', '');
            dbFolder = rawPath + '/LocalDatabase';
        }

        try {
            // Detectar el nombre real del archivo (ej: psico_clinic_dbSQLite.db)
            const dirResult = await Filesystem.readdir({ path: dbFolder });
            const targetFile = dirResult.files.find(f => {
                const fileName = typeof f === 'string' ? f : f.name;
                return fileName.includes(DB_NAME) && !fileName.includes('-journal');
            });

            const exactFileName = typeof targetFile === 'string' ? targetFile : targetFile?.name;

            if (!exactFileName) {
                throw new Error(`No se encontró el archivo de base de datos en ${dbFolder}`);
            }

            const exactDbPath = `${dbFolder}/${exactFileName}`;
            const dbFile = await Filesystem.readFile({ path: exactDbPath });

            let blobFile: Blob;
            if (typeof dbFile.data === 'string') {
                blobFile = this.base64ToBlob(dbFile.data, 'application/octet-stream');
            } else {
                blobFile = dbFile.data;
            }

            const metadata: any = {
                name: DB_NAME,
                mimeType: 'application/octet-stream',
            };

            if (!fileId) {
                metadata.parents = [folderId];
            }

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blobFile); 

            const url = fileId
                ? `${UPLOAD_API}/${fileId}?uploadType=multipart`
                : `${UPLOAD_API}?uploadType=multipart`;

            const res = await fetch(url, {
                method: fileId ? 'PATCH' : 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form
            });

            if (!res.ok) throw new Error("Error en la subida a Drive");
            console.log("¡Copia de seguridad subida con ÉXITO!");

        } catch (error) {
            console.error("Error FATAL en uploadDatabase:", error);
            throw error;
        }
    },

    // 4. DESCARGAR DESDE DRIVE (Buscando en PSICOAPP)
    async downloadDatabase(): Promise<void> {
        console.log("Iniciando restauración desde Google Drive...");
        const token = await this.getAccessToken();
        const folderId = await this.getOrCreateFolder(token);
        const fileId = await this.findFileIdInFolder(token, folderId);

        if (!fileId) throw new Error("No hay backup en Drive");

        const response = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Error al descargar el archivo");

        const blob = await response.blob();
        const base64 = await this.blobToBase64(blob);

        let dbFolder = "";
        if (Capacitor.getPlatform() === 'android') {
            const dataDir = await Filesystem.getUri({ directory: Directory.Data, path: '' });
            let rawPath = dataDir.uri.replace('file://', '');
            dbFolder = rawPath.replace('/files', '/databases');
        } else {
            const libDir = await Filesystem.getUri({ directory: Directory.Library, path: '' });
            let rawPath = libDir.uri.replace('file://', '');
            dbFolder = rawPath + '/LocalDatabase';
        }

        // Buscamos nombre exacto para sobrescribir
        let exactFileName = `${DB_NAME}SQLite.db`; 
        try {
            const dirResult = await Filesystem.readdir({ path: dbFolder });
            const targetFile = dirResult.files.find(f => {
                const fileName = typeof f === 'string' ? f : f.name;
                return fileName.includes(DB_NAME) && !fileName.includes('-journal');
            });
            if (targetFile) {
                exactFileName = typeof targetFile === 'string' ? targetFile : targetFile.name;
            }
        } catch(e) { /* Carpeta vacía */ }

        await Filesystem.writeFile({
            path: `${dbFolder}/${exactFileName}`,
            data: base64,
            recursive: true
        });

        console.log("¡Copia restaurada con ÉXITO! Reinicia la app.");
    },

    blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};