import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  fetchResearches,
  renameResearch,
  deleteResearch,
} from '../../services/researchService';
import './ResearchHub.scss';

const ResearchHub = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [researches, setResearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const renameInputRef = useRef(null);

  const loadResearches = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const data = await fetchResearches(token);
      setResearches(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load researches');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadResearches();
  }, [loadResearches]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleRenameSubmit = async (id) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    setError('');
    try {
      const updated = await renameResearch(token, id, trimmed);
      setResearches((prev) =>
        prev.map((r) => (r.id === id ? { ...r, name: updated.name, updated_at: updated.updated_at } : r)),
      );
      setRenamingId(null);
    } catch (err) {
      const msg =
        err?.response?.data?.name?.[0] ||
        err?.response?.data?.detail ||
        'Rename failed';
      setError(msg);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError('');
    try {
      await deleteResearch(token, id);
      setResearches((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="research-hub">
      <div className="research-hub__header">
        <h2 className="research-hub__title">My Researches</h2>
        <button
          type="button"
          className="research-hub__create-btn"
          onClick={() => navigate('/research/new')}
          title="Create research"
          aria-label="Create research"
        >
          +
        </button>
      </div>

      {error && <div className="research-hub__error">{error}</div>}

      {loading && <div className="research-hub__loading">Loading...</div>}

      {!loading && researches.length === 0 && (
        <div className="research-hub__empty">
          No researches yet. Use the + button above to create one.
        </div>
      )}

      {!loading && researches.length > 0 && (
        <ul className="research-hub__list">
          {researches.map((r) => (
            <li key={r.id} className="research-hub__item">
              {renamingId === r.id ? (
                <input
                  ref={renameInputRef}
                  className="research-hub__rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(r.id);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={() => handleRenameSubmit(r.id)}
                  maxLength={200}
                />
              ) : (
                <button
                  className="research-hub__open-btn"
                  type="button"
                  onClick={() => navigate(`/research/${r.id}`)}
                >
                  <span className="research-hub__research-name">{r.name}</span>
                  <span className="research-hub__research-meta">
                    {r.node_count || 0} nodes · {formatDate(r.updated_at)}
                  </span>
                </button>
              )}

              <div className="research-hub__actions">
                <button
                  className="research-hub__action-btn"
                  type="button"
                  onClick={() => {
                    setRenamingId(r.id);
                    setRenameValue(r.name);
                  }}
                  title="Rename"
                  aria-label="Rename"
                >
                  ✎
                </button>
                <button
                  className="research-hub__action-btn research-hub__action-btn--delete"
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  title="Delete"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ResearchHub;
