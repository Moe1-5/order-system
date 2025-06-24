import axios from 'axios';

const API_BASE_URL = "https://backend-lively-field-8013.fly.dev/api/public";


const customerApi = axios.create({
    baseURL: API_BASE_URL,
});

console.log("this is the API base url", API_BASE_URL);

export default customerApi;
