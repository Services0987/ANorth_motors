import React, { createContext, useContext, useState, useEffect } from 'react';

const PersonalizationContext = createContext();

export const PersonalizationProvider = ({ children }) => {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('autonorth_interest_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [topCategory, setTopCategory] = useState(null);

  useEffect(() => {
    localStorage.setItem('autonorth_interest_history', JSON.stringify(history));
    
    // Analyze top category
    if (history.length > 0) {
      const counts = {};
      history.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top) setTopCategory(top[0]);
    }
  }, [history]);

  const trackInterest = (vehicle) => {
    if (!vehicle) return;
    setHistory(prev => {
      // Keep only last 20 items, unique by ID
      const filtered = prev.filter(item => item.id !== (vehicle._id || vehicle.id));
      const newItem = {
        id: vehicle._id || vehicle.id,
        title: vehicle.title,
        category: vehicle.body_type || vehicle.category || 'Other',
        image: vehicle.images?.[0],
        price: vehicle.price,
        timestamp: Date.now()
      };
      return [newItem, ...filtered].slice(0, 20);
    });
  };

  return (
    <PersonalizationContext.Provider value={{ history, topCategory, trackInterest }}>
      {children}
    </PersonalizationContext.Provider>
  );
};

export const usePersonalization = () => {
  const context = useContext(PersonalizationContext);
  if (!context) throw new Error('usePersonalization must be used within PersonalizationProvider');
  return context;
};
