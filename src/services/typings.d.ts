declare namespace API {
  type LoginParams = {
    username?: string;
    password?: string;
  };
  type LoginResult = {
    name: string;
    access_token: string;
    token_type: string;
    expires_at: string;
    renewed: boolean;
  };
  type Result = {
    code: number;
    message: string;
    data: any;
    request_id?: string | null;
    error_code?: string | null;
    details?:
      | { loc: (string | number)[]; type?: string; msg: string }[]
      | Record<string, any>
      | null;
    new_access_token?: string | null;
    token_type?: string | null;
  };
}
