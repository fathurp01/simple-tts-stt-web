import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [pipelineData, setPipelineData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [mode, setMode] = useState('v2t'); // 'v2t' or 't2v'

  return (
    <AppContext.Provider value={{
      pipelineData, setPipelineData,
      validationResult, setValidationResult,
      mode, setMode
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
