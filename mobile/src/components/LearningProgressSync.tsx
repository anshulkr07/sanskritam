import React, { useEffect } from "react";
import { AppState } from "react-native";
import { useAuth } from "../store/auth";
import { syncLearningProgress } from "../services/progressStorage";

export default function LearningProgressSync() {
  const { learner } = useAuth();
  useEffect(() => {
    if (!learner) return;
    void syncLearningProgress();
    const sub = AppState.addEventListener("change", state => {
      if (state === "active") void syncLearningProgress();
    });
    return () => sub.remove();
  }, [learner?.id]);
  return null;
}
