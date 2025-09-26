import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import { mockUser } from "../data/mockData";
import { jwtRequest } from "../env";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updateSubscription: (tier: User["membershipTier"]) => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updatePaymentMethod: (paymentMethod: User["paymentMethod"]) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for existing session
    const fetchUser = async () => {
      try {
        const data = await jwtRequest("/me", "POST");
        setUser(data);
      } catch (error) {
        console.error("Error fetching dogs:", error);
      } finally {
        // setLoadingDogs(false);
      }
    };

    fetchUser();
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (email === "demo@example.com" && password === "demo123") {
      setUser(mockUser);
      localStorage.setItem("user", JSON.stringify(mockUser));
    } else {
      throw new Error("Invalid credentials");
    }
    setIsLoading(false);
  };

  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      membershipTier: "starter",
      joinDate: new Date().toISOString(),
      phone: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      subscription: {
        status: "active",
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        cancelAtPeriodEnd: false,
      },
      paymentMethod: {
        type: "card",
        last4: "",
        brand: "",
        expiryMonth: 1,
        expiryYear: new Date().getFullYear(),
      },
      preferences: {
        emailNotifications: true,
        smsAlerts: false,
        marketingEmails: false,
      },
    };

    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
    setIsLoading(false);
  };

  const logout = async () => {
    await localStorage.removeItem("jwt_token");
    window.location.href = "/login";
  };

  const updateProfile = async (updates: Partial<User>): Promise<void> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
    setIsLoading(false);
  };

  const updateSubscription = async (
    tier: User["membershipTier"]
  ): Promise<void> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (user) {
      const updatedUser = {
        ...user,
        membershipTier: tier,
        subscription: {
          ...user.subscription,
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
    setIsLoading(false);
  };

  const cancelSubscription = async (): Promise<void> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (user) {
      const updatedUser = {
        ...user,
        subscription: {
          ...user.subscription,
          cancelAtPeriodEnd: true,
        },
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
    setIsLoading(false);
  };

  const updatePaymentMethod = async (
    paymentMethod: User["paymentMethod"]
  ): Promise<void> => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (user) {
      const updatedUser = { ...user, paymentMethod };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        updateProfile,
        updateSubscription,
        cancelSubscription,
        updatePaymentMethod,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
