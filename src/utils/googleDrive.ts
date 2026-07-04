import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? sessionStorage.getItem('EBA_GD_ACCESS_TOKEN') : null;

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
        // Try getting it from sessionStorage first
        const token = sessionStorage.getItem('EBA_GD_ACCESS_TOKEN');
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
      sessionStorage.removeItem('EBA_GD_ACCESS_TOKEN');
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
    sessionStorage.setItem('EBA_GD_ACCESS_TOKEN', cachedAccessToken);
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
  sessionStorage.removeItem('EBA_GD_ACCESS_TOKEN');
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
