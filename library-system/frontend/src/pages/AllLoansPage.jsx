import { useEffect, useState } from 'react';
import { api } from '../api';
import LoansTable from '../components/LoansTable';
import Message from '../components/Message';

export default function AllLoansPage() {
  const [loans, setLoans] = useState([]);
  const [message, setMessage] = useState({ type: 'success', text: '' });

  async function loadLoans() {
    try {
      const data = await api.getAllLoans();
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
      await api.returnLoan(loan.id);
      setMessage({ type: 'success', text: `"${loan.book_title}" returned for ${loan.user_name}.` });
      loadLoans();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <div>
      <h2>All Loans</h2>
      <Message type={message.type} text={message.text} />
      <LoansTable loans={loans} showUser onReturn={handleReturn} />
    </div>
  );
}
