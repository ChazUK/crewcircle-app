/* v8 ignore file */
import { AuthRequest, ResponseType } from "expo-auth-session";
import type { DiscoveryDocument } from "expo-auth-session";

import { mapAuthResult } from "./mapAuthResult";

export type PKCEConnectParams = {
  authEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  scopes: string[];
  redirectUri: string;
};

export type PKCEConnectResult =
  | { success: true; authCode: string; codeVerifier: string }
  | { success: false; error: string };

export async function pkceConnect(params: PKCEConnectParams): Promise<PKCEConnectResult> {
  const request = new AuthRequest({
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    scopes: params.scopes,
    usePKCE: true,
    responseType: ResponseType.Code,
  });

  const discovery: DiscoveryDocument = {
    authorizationEndpoint: params.authEndpoint,
    tokenEndpoint: params.tokenEndpoint,
  };

  try {
    const result = await request.promptAsync(discovery);
    return mapAuthResult(result, request.codeVerifier);
  } catch {
    return { success: false, error: "OAuth flow failed" };
  }
}
