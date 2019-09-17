"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const stream = __importStar(require("stream"));
class MockStream extends stream.PassThrough {
    constructor(s3, Bucket, Key, options) {
        super();
        this.S3 = s3;
        this.bucket = Bucket;
        this.key = Key;
        this.options = options || {};
        let length = 0;
        this.S3.upload({
            Bucket: this.bucket,
            Key: this.key,
            Body: this,
            ...this.options
        }, (err, data) => {
            if (err) {
                this.emit("error", err);
            }
            else {
                data.size = length;
                this.emit("complete", data);
            }
        });
        this.on("data", (data) => {
            length += data.length;
        });
    }
}
/**
 * @todo Create local cache option
 * @body Makes sense and would improve performance / network costs to provide a local cache option xxGB/MB etc for frequently used files.
 */
class FileSystem {
    constructor(Connector) {
        this.bucket = Connector.bucket;
        this.S3 = Connector.S3;
    }
    createReadStream(key, range) {
        let params = {
            Bucket: this.bucket,
            Key: key,
        };
        if (range) {
            params.Range = range;
        }
        return this.S3.getObject(params).createReadStream();
    }
    createWriteStream(key, options) {
        return new MockStream(this.S3, this.bucket, key, options);
    }
    head(key) {
        return new Promise((resolve, reject) => {
            this.S3.headObject({ Bucket: this.bucket, Key: key }, (err) => {
                if (err) {
                    return reject();
                }
                return resolve();
            });
        });
    }
    async unlink(key) {
        return new Promise((resolve) => {
            this.head(key)
                .then(() => {
                this.S3.deleteObject({ Bucket: this.bucket, Key: key }, () => {
                    return resolve(true);
                });
            })
                .catch((e) => {
                resolve(false);
            });
        });
    }
    getSignedURL(key, expiry) {
        return this.S3.getSignedUrl("getObject", { Bucket: this.bucket, Key: key, Expires: expiry || 900 });
    }
}
exports.default = FileSystem;
