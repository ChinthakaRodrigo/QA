// Table of loans, used by "My Loans" and "All Loans".
function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString() : '-';
}

export default function LoansTable({ loans, showUser = false, onReturn }) {
  if (loans.length === 0) return <p>No loans yet.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Book</th>
          {showUser && <th>Member</th>}
          <th>Borrowed</th>
          <th>Due</th>
          <th>Returned</th>
          <th>Status</th>
          <th>Fine</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {loans.map((loan) => (
          <tr key={loan.id} data-testid={`loan-row-${loan.id}`}>
            <td>{loan.book_title}</td>
            {showUser && <td>{loan.user_name}</td>}
            <td>{formatDate(loan.borrowed_at)}</td>
            <td>{formatDate(loan.due_at)}</td>
            <td>{formatDate(loan.returned_at)}</td>
            <td><span className={`status ${loan.status}`}>{loan.status}</span></td>
            <td>${loan.fine}</td>
            <td>
              {loan.status !== 'returned' && (
                <button type="button" onClick={() => onReturn(loan)}>Return</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
