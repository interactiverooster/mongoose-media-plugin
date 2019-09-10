declare var process : {
    env: {
        AWS_ACCESS_KEY_ID: String,
        AWS_SECRET_ACCESS_KEY: String,
        bucket: String,
        NODE_ENV: 'development' | 'production';
        PORT?: string;
        PWD: string;
    }
}
