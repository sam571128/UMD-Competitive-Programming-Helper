require('dotenv').config();
const Keyv = require('@keyv/mongo');
const keyv = new Keyv(`${process.env.MONGODB_URI}`);

keyv.on('error', err=> console.error('Keyv connection error:', err));

module.exports = {
    async saveData(key, value) {
        keyv.set(key, value);
    },
    async removeData(key) {
        await keyv.delete(key)
    },
    async getData(key) {
        let result = await keyv.get(key).then(res=>{return res});
        return result;
    },
}