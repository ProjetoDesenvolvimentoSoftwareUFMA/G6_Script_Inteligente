import React, { useState, useEffect, useRef } from "react";
import "../styles/userDashboard.css"; // Importa o arquivo CSS
import { createChatCompletion, submitScript } from "../services/userService";
import axios from "axios";

interface ApiKey {
  name: string;
  key: string;
}

const UserDashboard: React.FC = () => {
  const [script, setScript] = useState(""); // Estado para armazenar o script inserido
  const [fileContent, setFileContent] = useState(""); // Estado para armazenar o conteúdo do arquivo
  const [corrections, setCorrections] = useState<string[]>([]); // Estado para armazenar as correções
  const [selectedCorrection, setSelectedCorrection] = useState(""); // Estado para armazenar a correção selecionada
  const [outputMessage, setOutputMessage] = useState(""); // Estado para armazenar a mensagem de saída
  const [showSupportMessage, setShowSupportMessage] = useState(false); // Estado para controlar a exibição da mensagem de suporte
  const [apiKeys] = useState<ApiKey[]>([
    { name: "GPT-4", key: "gpt3key123" },
    { name: "Modelo Local", key: "localModel" },
  ]);
  const [selectedApiKey, setSelectedApiKey] = useState(apiKeys[0].key); // Estado para a API de correção selecionada

  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  );
  const [message, setMessage] = useState("");
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const formatPrompt = (code: string) => {
    return `Por favor, corrija o seguinte código ou melhore ele, não dê explicações :\n\n${code}`;
  };

  const handleMessage = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setOutputMessage("Usuário não autenticado");
      return;
    }

    const formattedScript = formatPrompt(script);
    const updatedMessages = [
      ...messages,
      {
        role: "user",
        content: formattedScript,
      },
    ];
    setMessages(updatedMessages);
    setMessage("");

    try {
      const response = await createChatCompletion(updatedMessages);
      const chatResponse = response.choices[0]?.message;
      if (chatResponse && isMounted.current) {
        setMessages([...updatedMessages, chatResponse]);
        setCorrections([chatResponse.content]); // Supondo que a resposta da correção está no conteúdo
        setOutputMessage("Correção gerada com sucesso!");
      }
    } catch (error) {
      if (isMounted.current) {
        setOutputMessage("Erro ao gerar correção. Tente novamente.");
      }
    }
  };

  useEffect(() => {
    if (selectedApiKey) {
      // Aqui você pode adicionar a lógica para atualizar a API de correção no backend ou em qualquer outro lugar necessário
    }
  }, [selectedApiKey]);

  const handleScriptChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setScript(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleMessage();
  };

  const handleCorrectionSelect = (correction: string) => {
    setSelectedCorrection(correction);
  };

  const handleExecute = () => {
    const isOutputValid = Math.random() > 0.5; // Simulação de validação da saída
    setOutputMessage(
      isOutputValid ? "A saída é verdadeira." : "A saída é falsa."
    );
  };
  // Função para lidar com o clique no botão "Enviar para Suporte"
  const handleSendToSupport = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setOutputMessage("Usuário não autenticado");
      return;
    }

    try {
      // Supondo que você tenha uma rota no backend para lidar com o envio para suporte
      const response = await submitScript(token, {
        content: script,
      }); // Ajuste conforme necessário para o formato das correções
      setShowSupportMessage(true);
      setOutputMessage("Script enviado para suporte com sucesso.");
    } catch (error) {
      setOutputMessage("Erro ao enviar script para suporte. Tente novamente.");
    }
  };

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedKey = apiKeys.find(
      (apiKey) => apiKey.name === event.target.value
    )?.key;
    if (selectedKey) {
      setSelectedApiKey(selectedKey);
    }
  };

  useEffect(() => {
    if (selectedApiKey === "localModel") {
      const callLocalModel = async () => {
        try {
          const response = await axios.post(
            "http://localhost:11434/api/generate",
            {
              model: "codellama",
              prompt: formatPrompt(script),
              stream: false,
            }
          );
          if (response.data && response.data.message) {
            const localModelResponse = response.data.message;
            setMessages([
              ...messages,
              {
                role: "model",
                content: localModelResponse,
              },
            ]);
            setOutputMessage("Resposta do Modelo Local recebida com sucesso!");
          }
        } catch (error) {
          setOutputMessage("Erro ao chamar o Modelo Local. Tente novamente.");
        }
      };

      callLocalModel();
    }
  }, [selectedApiKey, script]); // Incluir script como dependência para atualizar com novos prompts

  return (
    <div className="dashboard-container">
      <h1>Bem-vindo ao painel de correção de script</h1>
      <form onSubmit={handleSubmit} className="form-container">
        <div className="textarea-container">
          <textarea
            id="script"
            name="script"
            value={script}
            onChange={handleScriptChange}
            rows={10}
            cols={50}
            placeholder="Digite o script para ser corrigido aqui"
          />
        </div>
        <div className="api-select-container">
          <label htmlFor="apiKeySelect">
            Selecionar API de correção disponível:
          </label>
          <select id="apiKeySelect" onChange={handleApiKeyChange}>
            {apiKeys.map((apiKey, index) => (
              <option key={index} value={apiKey.name}>
                {apiKey.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="submit-button">
          Enviar para correção
        </button>
        <button
          type="button"
          className="support-button"
          onClick={handleSendToSupport}
        >
          Enviar para suporte
        </button>
      </form>
      <div className="corrections-container">
        <h2>Possibilidade de Correção</h2>
        {corrections.map((correction, idx) => (
          <div key={idx} className="correction-card">
            <p>{correction}</p>
            <button onClick={() => handleCorrectionSelect(correction)}>
              Selecionar
            </button>
          </div>
        ))}
      </div>
      {selectedCorrection && (
        <div className="selected-correction-container">
          <h2>Correção Selecionada</h2>
          <textarea
            value={selectedCorrection}
            onChange={(e) => setSelectedCorrection(e.target.value)}
            rows={10}
            cols={50}
          />
          <button onClick={handleMessage} className="execute-button">
            Executar
          </button>
        </div>
      )}
      {outputMessage && (
        <div className="output-message">
          <p>{outputMessage}</p>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
