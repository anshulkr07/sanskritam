import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { ApiError, getAuthToken, request, type MeResponse } from "../api/client";
import { BASE_URL } from "../config";
import { GOOGLE_CLIENT_IDS, GOOGLE_LOGIN_ENABLED } from "../config";

export async function linkCommunityAccount(provider: "google" | "apple") {
  let idToken: string | null = null;
  if (provider === "google") {
    if (Platform.OS === "web" || !GOOGLE_LOGIN_ENABLED) throw Error("Google sign-in is available in the installed app.");
    const { GoogleSignin, isSuccessResponse } = await import("@react-native-google-signin/google-signin");
    GoogleSignin.configure({ webClientId: GOOGLE_CLIENT_IDS.webClientId });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    idToken = response.data.idToken;
  } else {
    const apple = await import("expo-apple-authentication");
    const response = await apple.signInAsync({ requestedScopes: [] });
    idToken = response.identityToken;
  }
  if (!idToken) throw Error("Sign-in did not return an identity token. Try again.");
  return request<MeResponse>(`/me/link/${provider}`, { method: "POST", body: JSON.stringify({ id_token: idToken }) }, true);
}

export async function chooseProfilePhoto(): Promise<MeResponse | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  let uri = "";
  for (const quality of [0.8, 0.6, 0.4]) {
    const ctx = ImageManipulator.manipulate(asset.uri);
    const edge = Math.min(asset.width, asset.height);
    ctx.crop({ originX: Math.floor((asset.width - edge) / 2), originY: Math.floor((asset.height - edge) / 2), width: edge, height: edge });
    ctx.resize({ width: 512, height: 512 });
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality });
    uri = result.uri;
    const size = Platform.OS === "web" ? (await (await fetch(uri)).blob()).size : await import("expo-file-system/legacy").then(async fs => {
      const info = await fs.getInfoAsync(uri); return info.exists ? info.size : 0;
    });
    if (size > 0 && size <= 512 * 1024) break;
    if (quality === 0.4) throw Error("This picture is too large. Crop it and try again.");
  }
  const url = BASE_URL + "/me/photo";
  const headers = { Authorization: `Bearer ${getAuthToken()}` };
  if (Platform.OS !== "web") {
    const fs = await import("expo-file-system/legacy");
    const res = await fs.uploadAsync(url, uri, { httpMethod: "POST", uploadType: fs.FileSystemUploadType.MULTIPART, fieldName: "file", mimeType: "image/jpeg", headers });
    const body = JSON.parse(res.body);
    if (res.status >= 400) throw new ApiError(res.status, body.detail || "Could not upload your picture.");
    return body;
  }
  const form = new FormData();
  form.append("file", await (await fetch(uri)).blob(), "profile.jpg");
  const response = await fetch(url, { method: "POST", headers, body: form });
  const body = await response.json();
  if (!response.ok) throw new ApiError(response.status, body.detail || "Could not upload your picture.");
  return body;
}

export const removeProfilePhoto = () => request<MeResponse>("/me/photo", { method: "DELETE" }, true);
