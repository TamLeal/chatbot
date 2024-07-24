import React, { useState, useEffect, useRef } from 'react';
import { Send, Square } from 'lucide-react';

const defaultQuestions = [
  "O que é inteligência artificial?",
  "Como funciona o aprendizado de máquina?",
  "Quais são as aplicações práticas da IA?",
  "Como a IA está mudando o mundo do trabalho?"
];

export default function Chatbot() {
  const [conversation, setConversation] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingEffectId, setTypingEffectId] = useState(null);
  const responseRef = useRef(null);
  const textareaRef = useRef(null);

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
    setConversation(prev => [...prev, { text: '', isAI }]);
    let i = 0;
    const intervalId = setInterval(() => {
      setConversation(prev => 
        prev.map((msg, index) => 
          index === prev.length - 1 ? { ...msg, text: message.slice(0, i + 1) } : msg
        )
      );
      i++;
      if (i >= message.length) {
        clearInterval(intervalId);
        setIsLoading(false);
        setTypingEffectId(null);
      }
    }, 30);
    setTypingEffectId(intervalId);
  };

  const handleQuestionSubmit = async (question) => {
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

  const fetchOpenAIResponse = async (prompt) => {
    setIsLoading(true);
    try {
      const response = await fetch('https://my-backend-ag7c.onrender.com/api/chat', { // Atualize esta URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: prompt })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      addMessageWithTypingEffect(data.choices[0].message.content.trim());
    } catch (error) {
      console.error('Erro ao chamar a API da OpenAI:', error);
      addMessageWithTypingEffect("Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.");
    }
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
      <div ref={responseRef} className="response-area">
        {conversation.map((message, index) => (
          <div key={index} className={`message ${message.isAI ? 'ai' : 'user'}`}>
            {message.isAI ? (
              <>
                <span className="emoji">🤖</span>
                <span className="message-text">{message.text}</span>
              </>
            ) : (
              <span className="message-text">{message.text}</span>
            )}
          </div>
        ))}
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
