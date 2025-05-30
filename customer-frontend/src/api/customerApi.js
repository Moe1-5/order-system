import axios from 'axios';

const customerApi = axios.create({
    baseURL: process.env.NODE_ENV === 'development'
        ? 'http://localhost:5000/api/public'
        : '/api/public',
});


export default customerApi;
