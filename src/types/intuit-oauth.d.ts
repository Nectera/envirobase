declare module "intuit-oauth" {
  interface OAuthClientConfig {
    clientId: string;
    clientSecret: string;
    environment: "sandbox" | "production";
    redirectUri: string;
  }

  interface TokenResponse {
    getJson(): {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
      id_token?: string;
    };
    text(): string;
  }

  class OAuthClient {
    static scopes: {
      Accounting: string;
      Payment: string;
      Payroll: string;
      TimeTracking: string;
      Benefits: string;
      Profile: string;
      Email: string;
      Phone: string;
      Address: string;
      OpenId: string;
    };

    constructor(config: OAuthClientConfig);
    authorizeUri(params: { scope: string[]; state?: string }): string;
    createToken(uri: string): Promise<TokenResponse>;
    refresh(): Promise<TokenResponse>;
    setToken(token: any): void;
    getToken(): any;
    makeApiCall(params: { url: string; method: string; body?: any; headers?: any }): Promise<TokenResponse>;
  }

  export default OAuthClient;
}
