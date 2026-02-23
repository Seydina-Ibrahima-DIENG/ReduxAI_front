import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [processedImageURL, setProcessedImageURL] = useState<string | null>(null);
  const [nbVariablesInit, setNbVariablesInit] = useState<number | null>(null);
  const [nbComposantes, setNbComposantes] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file || uploading) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExts = ["wav", "png"];

    if (!validExts.includes(ext || "")) {
      setStatus("❌ Format non supporté ! (Seuls .wav et .png)");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setStatus(`Fichier prêt : ${file.name}`);
    setProcessedImageURL(null);
    setNbVariablesInit(null);
    setNbComposantes(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploading) return;
    handleFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (uploading) return;
    if (e.target.files) handleFile(e.target.files[0]);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setStatus("❌ Aucun fichier sélectionné");
      return;
    }

    setUploading(true);
    setStatus("⏳ Envoi en cours...");
    setProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://redux-ai.onrender.com/traiter-fichier");

    xhr.responseType = "blob";

    // 🔥 Progression upload (limité à 70%)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const uploadPercent = Math.round((e.loaded / e.total) * 100);
        // Limiter l'upload à 70%, les 30% restants pour le traitement backend
        const scaledProgress = Math.round((uploadPercent / 100) * 70);
        setProgress(scaledProgress);
      }
    };

    xhr.onload = () => {
      // Le traitement est maintenant complet, porter la barre à 100%
      setProgress(100);
      setUploading(false);

      if (xhr.status === 200) {
        const ext = selectedFile.name.split(".").pop()?.toLowerCase();
        const blob = xhr.response;
        const url = window.URL.createObjectURL(blob);

        // 🔥 Télécharger automatiquement
        const a = document.createElement("a");
        a.href = url;
        a.download = `processed_${selectedFile.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setStatus("✅ Fichier traité et téléchargé !");

        // 🔥 Lire les headers envoyés par FastAPI
        const nbInit = xhr.getResponseHeader("X-Nb-Variables-Initiales");
        const nbComp = xhr.getResponseHeader("X-Nb-Composantes-Retenues");

        if (nbInit && nbComp) {
          setNbVariablesInit(Number(nbInit));
          setNbComposantes(Number(nbComp));
        }

        // Aperçu image si PNG
        if (ext === "png") {
          setProcessedImageURL(url);
        }

        // Nettoyage mémoire après 10 secondes
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 10000);

      } else {
        setStatus("❌ Erreur lors du traitement");
        setProgress(0);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setStatus("❌ Erreur réseau");
      setProgress(0);
    };

    xhr.send(formData);
  };

  return (
    <div className="app-wrapper">
      <header className="header">
        <div className="logo-section">
          <div className="icon-bolt">⚡</div>
          <div>
            <h1>Redux AI</h1>
            <p className="subtitle">Réduction de dimensions / Traitement PNG</p>
          </div>
        </div>
      </header>

      <main className="main-content">
        <h2 className="section-title">
          Avantages de la réduction de dimensions
        </h2>

        <div className="cards-container">
          <div className="card">
            <div className="card-icon blue-bg">📉</div>
            <h3>Compression optimale</h3>
            <p>
              Réduisez la taille de vos fichiers tout en conservant les
              informations essentielles
            </p>
          </div>
          <div className="card">
            <div className="card-icon purple-bg">⚙️</div>
            <h3>Traitement rapide</h3>
            <p>Optimisez vos données instantanément grâce à l'ACP</p>
          </div>
          <div className="card">
            <div className="card-icon lightblue-bg">⏲️</div>
            <h3>Contrôle précis</h3>
            <p>
              Ajustez le nombre de composantes pour trouver l'équilibre parfait
              entre qualité et compression
            </p>
          </div>
        </div>

        {uploading && (
          <div className="progress-container">
            <div
              className="progress-bar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        <div
          className={`drop-zone ${selectedFile ? "file-selected" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            opacity: uploading ? 0.5 : 1,
            pointerEvents: uploading ? "none" : "auto",
          }}
        >
          <div className="upload-icon">📤</div>
          {uploading ? (
            <p className="upload-text">⏳ Envoi en cours... {progress}%</p>
          ) : (
            <>
              <p className="upload-text">Glissez votre fichier ici</p>
              <p className="upload-subtext">ou cliquez pour parcourir</p>
              <p className="formats">
                Formats acceptés: .wav (audio), .png (image)
              </p>
            </>
          )}
          <input
            type="file"
            ref={fileInputRef}
            accept=".wav,.png"
            style={{ display: "none" }}
            onChange={handleChange}
          />
        </div>

        {status && <div className="status-message">{status}</div>}

        {selectedFile && !uploading && (
          <button className="btn-upload" onClick={handleUpload}>
            Lancer le traitement
          </button>
        )}

        {processedImageURL && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <h3>Aperçu du fichier transformé :</h3>
            <img
              src={processedImageURL}
              alt="Image transformée"
              style={{
                maxWidth: "100%",
                borderRadius: "12px",
                marginTop: "10px",
              }}
            />
            {nbVariablesInit !== null && nbComposantes !== null && (
              <p style={{ marginTop: "10px", fontWeight: 600 }}>
                Variables initiales : {nbVariablesInit} | Composantes retenues :{" "}
                {nbComposantes} (90% variance)
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
