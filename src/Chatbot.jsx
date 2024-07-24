import React, { useState, useEffect, useRef } from 'react';
import { Send, Key, CheckCircle, XCircle, Square } from 'lucide-react';

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
  const [typingEffectId, setTypingEffectId] = useState(null); // ID for the typing effect interval
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
        setIsLoading(false); // Stop loading when the message is fully displayed
        setTypingEffectId(null); // Clear the interval ID
      }
    }, 30);
    setTypingEffectId(intervalId); // Save the interval ID to state
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
          model: "gpt-4",
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
    }
  };

  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
    setApiKeyStatus(null);
  };

  const stopResponse = () => {
    if (typingEffectId) {
      clearInterval(typingEffectId);
      setTypingEffectId(null);
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <div className="api-input">
        <Key className="icon" />
        <input
          ref={apiInputRef}
          type="password"
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder="Insira sua chave da API OpenAI"
          className={isFlashing ? 'animate-flash' : ''}
        />
        {apiKeyStatus === 'valid' && <CheckCircle className="status valid" />}
        {apiKeyStatus === 'invalid' && <XCircle className="status invalid" />}
      </div>
      <div ref={responseRef} className="response-area">
        {conversation.length === 0 ? (
          <p>Selecione uma pergunta abaixo ou digite sua própria pergunta.</p>
        ) : (
          conversation.map((message, index) => (
            <div key={index} className={`message ${message.isAI ? 'ai' : 'user'}`}>
              {message.isAI ? (
                <>
                  <span className="emoji">🤖</span>
                  <span className="message-text">{message.text}</span>
                </>
              ) : (
                <>
                  <span className="message-text">{message.text}</span>
                </>
              )}
            </div>
          ))
        )}
      </div>
      <div className="default-questions">
        {defaultQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleQuestionSubmit(question)}
            disabled={isLoading}
          >
            {question}
          </button>
        ))}
      </div>
      <form onSubmit={handleManualSubmit} className="message-input">
        <textarea
          ref={textareaRef}
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          placeholder="Digite sua pergunta aqui..."
          rows="1"
          disabled={isLoading && typingEffectId}
        />
        <button type="button" onClick={isLoading ? stopResponse : handleManualSubmit}>
          {isLoading ? <Square /> : <Send />}
        </button>
      </form>
    </div>
  );
}
