import React, { useState, useEffect, useRef } from 'react';
import { Send, Key, CheckCircle, XCircle } from 'lucide-react';

const defaultQuestions = [
  "O que é inteligência artificial?",
  "Como funciona o aprendizado de máquina?",
  "Quais são as aplicações práticas da IA?",
  "Como a IA está mudando o mundo do trabalho?"
];

export default function Chatbot() {
  const [conversation, setConversation] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState(null); // null, 'valid', or 'invalid'
  const [isLoading, setIsLoading] = useState(false);
  const responseRef = useRef(null);
  const textareaRef = useRef(null);
  const apiInputRef = useRef(null);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [conversation]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [manualInput]);

  const addMessageWithTypingEffect = (message, isAI = true) => {
    let i = 0;
    const intervalId = setInterval(() => {
      setConversation(prev => [
        ...prev.slice(0, -1),
        { text: message.slice(0, i + 1), isAI }
      ]);
      i++;
      if (i >= message.length) {
        clearInterval(intervalId);
      }
    }, 30);
  };

  const handleQuestionSubmit = async (question) => {
    if (!isValidApiKey()) {
      flashApiInput();
      return;
    }
    setConversation(prev => [...prev, { text: question, isAI: false }]);
    await fetchOpenAIResponse(question);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      await handleQuestionSubmit(manualInput);
      setManualInput('');
    }
  };

  const isValidApiKey = () => {
    return apiKey.trim().length > 0;
  };

  const flashApiInput = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 1500);
  };

  const fetchOpenAIResponse = async (prompt) => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      setApiKeyStatus('valid');
      const data = await response.json();
      const aiResponse = data.choices[0].message.content.trim();
      addMessageWithTypingEffect(aiResponse);
    } catch (error) {
      console.error('Erro ao chamar a API da OpenAI:', error);
      setApiKeyStatus('invalid');
      let errorMessage = 'Ocorreu um erro ao processar sua solicitação.';
      if (error.message.includes('Failed to fetch')) {
        errorMessage += ' Verifique sua conexão com a internet ou se há um bloqueio de CORS.';
      } else {
        errorMessage += ` Erro: ${error.message}`;
      }
      errorMessage += ' Por favor, verifique sua chave API e tente novamente.';
      addMessageWithTypingEffect(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
    setApiKeyStatus(null);
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4 bg-gray-100">
      <div className="mb-4 flex items-center">
        <Key className="w-5 h-5 mr-2 text-gray-500" />
        <input
          ref={apiInputRef}
          type="password"
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder="Insira sua chave da API OpenAI"
          className={`flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${
            isFlashing ? 'animate-flash' : ''
          }`}
        />
        {apiKeyStatus === 'valid' && <CheckCircle className="w-5 h-5 ml-2 text-green-500" />}
        {apiKeyStatus === 'invalid' && <XCircle className="w-5 h-5 ml-2 text-red-500" />}
      </div>
      <div 
        ref={responseRef}
        className="flex-grow overflow-auto mb-4 p-4 bg-white rounded-lg shadow"
      >
        {conversation.length === 0 ? (
          <p className="text-gray-500">Selecione uma pergunta abaixo ou digite sua própria pergunta.</p>
        ) : (
          conversation.map((message, index) => (
            <div key={index} className={`mb-2 ${message.isAI ? 'text-blue-600' : 'text-gray-800'}`}>
              <span className="font-bold">{message.isAI ? 'IA: ' : 'Você: '}</span>
              <span className="whitespace-pre-wrap">{message.text}</span>
            </div>
          ))
        )}
        {isLoading && <p className="text-gray-500">Carregando resposta...</p>}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {defaultQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleQuestionSubmit(question)}
            className="p-2 bg-white text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-sm text-left"
            disabled={isLoading}
          >
            {question}
          </button>
        ))}
      </div>
      <form onSubmit={handleManualSubmit} className="flex items-end">
        <div className="flex-grow relative">
          <textarea
            ref={textareaRef}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Digite sua pergunta aqui..."
            className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
            rows="1"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isLoading}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
