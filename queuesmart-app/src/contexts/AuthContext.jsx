/**
 * QueueSmart - Logged-in user state. Owner: Killian.
 * Everyone: read the user with useAuth(), don't touch localStorage directly.
 */
import { createContext, useContext, useEffect, useState } from "react";
import { authApi, setToken, clearToken, getToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On page load, if we still have a token, ask the backend who it belongs to.
    useEffect(() => {
        if (!getToken()) {
            setLoading(false);
            return;
        }
        authApi
            .me()
            .then((data) => setUser(data.user))
            .catch(() => clearToken())
            .finally(() => setLoading(false));
    }, []);

    async function login(email, password) {
        const data = await authApi.login({ email, password });
        setToken(data.token);
        setUser(data.user);
        return data.user;
    }

    async function register(name, email, password) {
        const data = await authApi.register({ name, email, password });
        setToken(data.token);
        setUser(data.user);
        return data.user;
    }

    function logout() {
        clearToken();
        setUser(null);
    }

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        isLoggedIn: user !== null,
        isAdmin: user?.role === "admin",
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}