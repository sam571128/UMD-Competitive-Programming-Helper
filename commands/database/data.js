require('dotenv').config();
const Keyv = require('@keyv/mongo');
const keyv = new Keyv(`mongodb+srv://samlee571128:${process.env.MONGODB_PASS}@cluster0.w1sltzk.mongodb.net/?retryWrites=true&w=majority`);

keyv.on('error', err=> console.error('Keyv connection error:', err));

module.exports = {
    async saveData(key, value) {
        keyv.set(key, value);
    },
    async removeData(key, value) {
        await keyv.delete(key)
    },
    async getData(key) {
        let result = await keyv.get(key).then(res=>{return res});
        return result;
    },
}