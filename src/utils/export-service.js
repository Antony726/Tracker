import { getRecentTransactions } from '../transactions/transaction-service.js';
import { getCurrentUser } from '../auth/auth-service.js';
import { showToast } from '../components/toast.js';
import { formatDate, formatCurrency } from './dom.js';

export async function exportToPDF() {
    const user = getCurrentUser();
    if (!user) return;
    if (!window.jspdf) {
        showToast("PDF Library not loaded", "error");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Fetch last 100 transactions for export
        const transactions = await getRecentTransactions(user.uid, 100);
        
        doc.setFontSize(20);
        doc.text("Expence Report", 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        
        const tableData = transactions.map(tx => [
            formatDate(tx.timestamp),
            tx.category || 'General',
            tx.type === 'income' ? 'Income' : (tx.expenseMode === 'external' ? 'Shared Expense' : 'Personal Expense'),
            tx.note || '-',
            `${tx.type === 'income' ? '+' : '-'}${tx.amount}`
        ]);
        
        doc.autoTable({
            startY: 40,
            head: [['Date', 'Category', 'Type', 'Notes', 'Amount']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [108, 93, 211] }
        });
        
        doc.save(`Expence_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast("PDF Exported Successfully!", "success");
    } catch (error) {
        console.error("PDF Export Error:", error);
        showToast("Failed to export PDF", "error");
    }
}

export async function exportToExcel() {
    const user = getCurrentUser();
    if (!user) return;
    if (!window.XLSX) {
        showToast("Excel Library not loaded", "error");
        return;
    }

    try {
        // Fetch last 100 transactions for export
        const transactions = await getRecentTransactions(user.uid, 100);
        
        const data = transactions.map(tx => ({
            Date: formatDate(tx.timestamp),
            Category: tx.category || 'General',
            Type: tx.type === 'income' ? 'Income' : (tx.expenseMode === 'external' ? 'Shared Expense' : 'Personal Expense'),
            Notes: tx.note || '-',
            Amount: tx.type === 'income' ? Math.abs(tx.amount) : -Math.abs(tx.amount)
        }));
        
        const worksheet = window.XLSX.utils.json_to_sheet(data);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
        
        window.XLSX.writeFile(workbook, `Expence_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        showToast("Excel Exported Successfully!", "success");
    } catch (error) {
        console.error("Excel Export Error:", error);
        showToast("Failed to export Excel", "error");
    }
}
