declare namespace API {
    type LoginParams = {
        username?: string;
        password?: string;
    };
    type LoginResult = {
        name: string;
        access_token: string,
        token_type: string,
        expires_at: string,
        renewed: boolean
    };
    type Result = {
        code: number,
        message: string,
        data: any,
        new_access_token: string,
        token_type: string
    }
}