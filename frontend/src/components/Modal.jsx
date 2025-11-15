import React from "react";
import "../styles/Modal.css";

function Modal({ isOpen, onClose, title, children, variant = "default", hideBackground = false, contentClassName = '', modalBgClassName = '' }) {
  if (!isOpen) return null;

  const backgrounds = {
    default: "/modal.svg",
    config: "/modal-yellow.svg",
    feedback: "/modal-green.svg",
    puzzle: "/light-puzzle.svg",
    faseInfo: "/modal-fase-info.svg",
    worldConfig: "/modal-world.svg",
    placar: "/modal-placar.svg"
  };

  const imgStyle =
    variant === "feedback"
      ? { width: "40rem", height: "40rem" }
      : {};

  const animationStyle = variant === "puzzle"
  ? { animation: "rotate 20s linear infinite"}
  : {};

  return (
    <div className={`modal-overlay ${hideBackground ? 'no-bg' : ''}`} onClick={onClose}>
      {!hideBackground && (
        <img 
        src={backgrounds[variant]} 
        alt="fundo-modal" className={`modal-bg ${modalBgClassName}`}
        style={{ ...imgStyle, ...animationStyle }}
        />
      )}
       <div
        className={`modal-content ${contentClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="modal-title">{title}</h2>}
        <div className="modal-body">{children}</div>
        <button onClick={onClose} className="close-btn">
          Fechar
        </button>
      </div>
    </div>
  );
}

export default Modal;
