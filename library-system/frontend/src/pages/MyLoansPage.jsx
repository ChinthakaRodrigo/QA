import { useEffect, useState } from 'react';
import { api } from '../api';
import LoansTable from '../components/LoansTable';
import Message from '../components/Message';

export default function MyLoansPage() {
  const [loans, setLoans] = useState([]);
  const [message, setMessage] = useState({ type: 'success', text: '' });

  async function loadLoans() {
    try {
      const data = await api.getMyLoans();
      setLoans(data.loans);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  useEffect(() => {
    loadLoans();
  }, []);

  async function handleReturn(loan) {
    try {
      const { loan: returned } = await api.returnLoan(loan.id);
      const fineText = returned.fine > 0 ? ` Late fine: $${returned.fine}.` : '';
      setMessage({ type: 'success', text: `"${loan.book_title}" returned.${fineText}` });
      loadLoans();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <div>
      <h2>My Loans</h2>
      <Message type={message.type} text={message.text} />
      <LoansTable loans={loans} onReturn={handleReturn} />
    </div>
  );
}
