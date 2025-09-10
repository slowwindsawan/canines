import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { membershipTiers } from "../data/mockData";
import { Crown, Check, Star } from "lucide-react";
import SubscribeNow from "../components/SubscriptionStatus";
import { jwtRequest } from "../env";

const Tiers: React.FC = () => {
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Simulate checking for existing session
    const fetchUser = async () => {
      try {
        const data = await jwtRequest("/me", "POST");
        setUser(data);
        console.log("Fetched user:", data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dogs:", error);
      } finally {
        // setLoadingDogs(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <>
      {loading ? (
        <></>
      ) : (
        <>
          <SubscribeNow
            currentStatus={user?.subscription_status}
            currentPlan={user?.subscription_tier}
          />
        </>
      )}
    </>
  );
};

export default Tiers;
