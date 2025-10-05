import axios from 'axios';

const API_BASE_URL = "http://localhost:5000/api/public";


const customerApi = axios.create({
    baseURL: API_BASE_URL,
});

console.log("this is the API base url", API_BASE_URL);

export default customerApi;
