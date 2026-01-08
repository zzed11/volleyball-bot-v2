import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { financialApi } from '@/api/financialApiClient';
import {
  FinancialTransaction,
  CreateTransactionDto,
  ExpenseCategory,
  FinancialSummary,
} from '@/types/financial';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<CreateTransactionDto>({
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'income',
    amount: 0,
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [transactionsData, categoriesData, summaryData] = await Promise.all([
        financialApi.getTransactions(),
        financialApi.getCategories(),
        financialApi.getFinancialSummary(),
      ]);
      setTransactions(transactionsData);
      setCategories(categoriesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (transaction?: FinancialTransaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        transaction_date: transaction.transaction_date.split('T')[0],
        type: transaction.type,
        amount: transaction.amount,
        category_id: transaction.category_id,
        game_id: transaction.game_id,
        description: transaction.description || '',
        notes: transaction.notes || '',
      });
    } else {
      setEditingTransaction(null);
      setFormData({
        transaction_date: new Date().toISOString().split('T')[0],
        type: 'income',
        amount: 0,
        description: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await financialApi.updateTransaction(editingTransaction.id, formData);
        toast({
          title: 'Success',
          description: 'Transaction updated successfully',
        });
      } else {
        await financialApi.createTransaction(formData);
        toast({
          title: 'Success',
          description: 'Transaction created successfully',
        });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save transaction',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await financialApi.deleteTransaction(id);
      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
      });
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete transaction',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">
              Transaction Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Add and manage all income and expense transactions
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      (parseFloat(summary?.current_balance?.toString() || '0') || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ₪{summary?.current_balance ? parseFloat(summary.current_balance.toString()).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">All-time balance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">YTD Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₪{summary?.total_income_ytd ? parseFloat(summary.total_income_ytd.toString()).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date().getFullYear()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">YTD Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ₪{summary?.total_expenses_ytd ? parseFloat(summary.total_expenses_ytd.toString()).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date().getFullYear()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">YTD Net Profit</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      (parseFloat(summary?.net_profit_ytd?.toString() || '0') || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    ₪{summary?.net_profit_ytd ? parseFloat(summary.net_profit_ytd.toString()).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary?.transaction_count_ytd || 0} transactions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-semibold">Date</th>
                          <th className="text-left p-4 font-semibold">Description</th>
                          <th className="text-left p-4 font-semibold">Category</th>
                          <th className="text-left p-4 font-semibold">Type</th>
                          <th className="text-right p-4 font-semibold">Amount</th>
                          <th className="text-right p-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="border-b hover:bg-muted/50">
                            <td className="p-4">{formatDate(transaction.transaction_date)}</td>
                            <td className="p-4">
                              <div className="font-medium">{transaction.description || '—'}</div>
                              {transaction.notes && (
                                <div className="text-sm text-muted-foreground">
                                  {transaction.notes}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {transaction.category_name || '—'}
                            </td>
                            <td className="p-4">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.type === 'income'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {transaction.type}
                              </span>
                            </td>
                            <td
                              className={`p-4 text-right font-bold ${
                                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {transaction.type === 'expense' && '-'}₪
                              {parseFloat(transaction.amount.toString()).toFixed(2)}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(transaction)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(transaction.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-1">No transactions yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by adding your first income or expense transaction
                    </p>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Transaction
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </DialogTitle>
              <DialogDescription>
                {editingTransaction
                  ? 'Update the transaction details'
                  : 'Add a new income or expense transaction'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="transaction_date">Date</Label>
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) =>
                    setFormData({ ...formData, transaction_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'income' | 'expense') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (₪)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Select
                  value={formData.category_id?.toString() || 'none'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      category_id: value === 'none' ? undefined : parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Player registration fees, Hall rental"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingTransaction ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
