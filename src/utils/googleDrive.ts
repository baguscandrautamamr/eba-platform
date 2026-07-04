import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('EBA_GD_ACCESS_TOKEN') : null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Try getting it from localStorage first
        const token = localStorage.getItem('EBA_GD_ACCESS_TOKEN');
        if (token) {
          cachedAccessToken = token;
          if (onAuthSuccess) onAuthSuccess(user, token);
        } else {
          // If logged in but token is not in cache (e.g., page refreshed),
          // we ask the user to sign in again to get the token.
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('EBA_GD_ACCESS_TOKEN');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('EBA_GD_ACCESS_TOKEN', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive connection error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Google Sign-Out
export const googleSignOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('EBA_GD_ACCESS_TOKEN');
};

// Retrieve token in-memory
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Base64 helper to Blob
const base64ToBlob = (base64Str: string): Blob => {
  const parts = base64Str.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

// Get or Create "EBA Progress Photos" Folder in Google Drive
export const getOrCreateFolder = async (token: string): Promise<string> => {
  const folderName = 'EBA Progress Photos';
  
  // Try to search if the folder already exists in the user's Drive
  try {
    const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }
  } catch (e) {
    console.warn('Error searching for Google Drive folder:', e);
  }

  // Create the folder if it does not exist
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder: ${errText}`);
  }

  const createData = await createRes.json();
  return createData.id;
};

// Upload single image Base64 string to Google Drive
export const uploadPhotoToDrive = async (
  token: string,
  base64Str: string,
  filename: string,
  folderId?: string
): Promise<{ id: string; webViewLink?: string }> => {
  const blob = base64ToBlob(base64Str);
  
  // Construct metadata
  const metadata: Record<string, any> = {
    name: filename,
    mimeType: blob.type,
  };
  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = 'foo_bar_boundary_eba';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  // Reader for reading the Blob into a binary string for multipart body
  const reader = new FileReader();
  const binaryPromise = new Promise<string>((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsBinaryString(blob);
  });
  
  const binaryContent = await binaryPromise;

  const multipartBody = 
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${blob.type}\r\n` +
    'Content-Transfer-Encoding: binary\r\n\r\n' +
    binaryContent +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to upload photo to Google Drive: ${errText}`);
  }

  return response.json();
};

// Google Apps Script (GAS) URL Accessors
export const getGasUrl = (): string | null => {
  if (typeof window !== 'undefined') {
    const localGas = localStorage.getItem('EBA_GAS_URL');
    if (localGas && localGas.trim() !== '') {
      return localGas.trim();
    }
  }
  // Fallback to static build variable if configured
  const envGas = (import.meta as any).env?.VITE_GAS_URL;
  if (envGas && envGas.trim() !== '') {
    return envGas.trim();
  }
  // Default fallback provided by user
  return 'https://script.google.com/macros/s/AKfycbxJ-UICijMTC1gLNqabGo89oDCM3F8XwEY7hAf7D4GD_3dCjROAU2o8AUBVR9OxzcWe/exec';
};

export const setGasUrl = (url: string | null) => {
  if (typeof window !== 'undefined') {
    if (url) {
      localStorage.setItem('EBA_GAS_URL', url.trim());
    } else {
      localStorage.removeItem('EBA_GAS_URL');
    }
  }
};

// Upload photo via Google Apps Script Web App (No authentication needed for the uploader!)
export const uploadPhotoViaGas = async (
  gasUrl: string,
  base64Str: string,
  filename: string,
  userRole: string,
  photoMeta?: {
    id: string;
    projectId: string;
    projectName: string;
    date: string;
    time: string;
    notes: string;
    gpsLocation?: string;
    roomName?: string;
  }
): Promise<{ id: string; webViewLink?: string }> => {
  try {
    const payload = {
      image: base64Str,
      filename: filename,
      userRole: userRole,
      photoMeta: photoMeta
    };

    // We send payload as text/plain to avoid preflight CORS preflight requests 
    // that sometimes cause issues with Google Apps Script redirect URL handling.
    const response = await fetch(gasUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });

    if (!response.ok) {
      throw new Error(`GAS Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.success) {
      return {
        id: data.fileId || `gas_${Date.now()}`,
        webViewLink: data.webViewLink
      };
    } else {
      throw new Error(data?.error || 'Failed to parse response from Apps Script');
    }
  } catch (error: any) {
    console.error('Google Apps Script upload failed:', error);
    throw new Error(error.message || 'Network error during Google Apps Script upload');
  }
};

// Extract Google Drive file ID from a URL
export const extractDriveFileId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  // Match /file/d/FILE_ID/...
  const matchD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) {
    return matchD[1];
  }
  // Match id=FILE_ID
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return matchId[1];
  }
  return null;
};

// Delete photo from Google Drive via OAuth
export const deletePhotoFromDrive = async (token: string, fileId: string): Promise<void> => {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to delete photo from Google Drive: ${errText}`);
  }
};

// Delete photo from Google Drive via Google Apps Script (GAS)
export const deletePhotoViaGas = async (gasUrl: string, fileId: string): Promise<void> => {
  const payload = {
    action: 'delete',
    fileId: fileId
  };

  const response = await fetch(gasUrl, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    }
  });

  if (!response.ok) {
    throw new Error(`GAS Server responded with status: ${response.status}`);
  }

  const data = await response.json();
  if (!data || !data.success) {
    throw new Error(data?.error || 'Failed to delete photo via Apps Script');
  }
};

// Sync Text Database (Projects, Employees, Attendance, Materials, Expenses, Photos) via GAS
export const syncDatabaseViaGas = async (
  gasUrl: string,
  type: 'get' | 'put',
  dbData?: any
): Promise<any> => {
  const payload = {
    action: 'sync_db',
    type,
    db: dbData
  };

  const response = await fetch(gasUrl, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    }
  });

  if (!response.ok) {
    throw new Error(`GAS Server responded with status: ${response.status}`);
  }

  const data = await response.json();
  if (!data || !data.success) {
    throw new Error(data?.error || 'Failed database sync operation via Apps Script');
  }

  return data;
};



