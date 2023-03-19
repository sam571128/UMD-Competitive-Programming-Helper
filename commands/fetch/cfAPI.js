const fetch = require('node-fetch');
const { API } = require('./link.js');

module.exports = {
    async getUser(handle) {
        const url = new URL(API.user);
        url.searchParams.append('handles',handle);
        return fetch(url).then(res=>{return res.json()});
    },
    async getSubmission(count) {
        const url = new URL(API.submissions);
        url.searchParams.append('count',count);
        return fetch(url).then(res=>{return res.json()});
    },
    async getUserSubmission(handle, count = 0) {
        const url = new URL(API.userStatus);
        url.searchParams.append('handle',handle);
        if(count != 0){
            url.searchParams.append('from',1);
            url.searchParams.append('count', count);
        }
        return fetch(url).then(res=>{return res.json()});
    },
    async getProblem(tags){
        let params = tags.join(';');
        const url = new URL(API.problem);
        url.searchParams.append('tags',params);
        return fetch(url).then(res=>{return res.json();});
    }
};
