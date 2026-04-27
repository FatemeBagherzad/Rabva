import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createResearch } from '../../services/researchService';
import './ResearchCreate.scss';

const ResearchCreate = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError('');
    try {
      const created = await createResearch(token, trimmed);
      navigate(`/research/${created.id}`, { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.name?.[0] ||
        err?.response?.data?.detail ||
        'Failed to create research';
      setError(msg);
      setCreating(false);
    }
  };

  return (
    <div className="research-create">
      <div className="research-create__header">
        <button
          type="button"
          className="research-create__icon-btn"
          onClick={() => navigate('/research')}
          title="Back to researches"
          aria-label="Back to researches"
        >
          ←
        </button>
        <h2 className="research-create__title">New research</h2>
      </div>

      <form className="research-create__form" onSubmit={handleSubmit}>
        <label className="research-create__field">
          <span className="research-create__label">Name</span>
          <input
            ref={inputRef}
            className="research-create__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            disabled={creating}
          />
        </label>

        {error && <div className="research-create__error">{error}</div>}

        <div className="research-create__actions">
          <button
            type="button"
            className="research-create__icon-btn"
            onClick={() => navigate('/research')}
            disabled={creating}
            title="Cancel"
            aria-label="Cancel"
          >
            ✕
          </button>
          <button
            type="submit"
            className="research-create__icon-btn research-create__icon-btn--primary"
            disabled={!name.trim() || creating}
            title="Create research"
            aria-label="Create research"
          >
            {creating ? '…' : '✓'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResearchCreate;
