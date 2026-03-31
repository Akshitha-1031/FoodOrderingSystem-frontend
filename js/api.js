const API_BASE = '/api';

const api = {
    getToken() {
        return localStorage.getItem('foodie_token');
    },

    setToken(token) {
        localStorage.setItem('foodie_token', token);
    },

    getUser() {
        const userStr = localStorage.getItem('foodie_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    setUser(user) {
        localStorage.setItem('foodie_user', JSON.stringify(user));
    },

    clearAuth() {
        localStorage.removeItem('foodie_token');
        localStorage.removeItem('foodie_user');
    },

    async request(endpoint, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers,
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Something went wrong');
            }

            return result;
        } catch (error) {
            throw error;
        }
    }
};
