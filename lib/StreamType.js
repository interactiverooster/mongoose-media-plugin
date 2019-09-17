"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const stream_1 = __importDefault(require("stream"));
function Stream(key, options) {
    return mongoose_1.default.SchemaType.call(this, key, options, 'ReadableStream');
}
exports.default = Stream;
Stream.prototype = Object.create(mongoose_1.default.SchemaType.prototype);
Stream.prototype.cast = function (val) {
    if (!(val instanceof stream_1.default)) {
        throw new Error("Not a readable stream.");
    }
    return val;
};
