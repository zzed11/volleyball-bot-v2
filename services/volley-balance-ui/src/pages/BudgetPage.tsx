import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { financialApi } from '@/api/financialApiClient';
import { BudgetItem, CreateBudgetItemDto } from '@/types/financial';
import { Loader2, Plus, Pencil, Trash2, Target } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function BudgetPage() {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<CreateBudgetItemDto>({
    year: selectedYear,
    type: 'income',
    amount: 0,
    description: '',
    frequency: 'monthly',
  });

  useEffect(() => {
    loadBudget();
  }, [selectedYear]);

  const loadBudget = async () => {
    try {
      setIsLoading(true);
      const data = await financialApi.getBudgetItems(selectedYear);
      setBudgetItems(data);
    } catch (error) {
      console.error('Failed to load budget:', error);
      toast({
        title: 'Error',
        description: 'Failed to load budget items',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleOpenDialog = (item?: BudgetItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        year: item.year,
        type: item.type,
        category_id: item.category_id,
        amount: item.amount,
        description: item.description || '',
        frequency: item.frequency || 'monthly',
        notes: item.notes || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        year: selectedYear,
        type: 'income',
        amount: 0,
        description: '',
        frequency: 'monthly',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await financialApi.updateBudgetItem(editingItem.id, formData);
        toast({
          title: 'Success',
          description: 'Budget item updated successfully',
        });
      } else {
        await financialApi.createBudgetItem(formData);
        toast({
          title: 'Success',
          description: 'Budget item created successfully',
        });
      }
      setIsDialogOpen(false);
      loadBudget();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save budget item',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this budget item?')) return;

    try {
      await financialApi.deleteBudgetItem(id);
      toast({
        title: 'Success',
        description: 'Budget item deleted successfully',
      });
      loadBudget();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete budget item',
        variant: 'destructive',
      });
    }
  };

  const incomeItems = budgetItems.filter(item => item.type === 'income');
  const expenseItems = budgetItems.filter(item => item.type === 'expense');
  const totalIncome = incomeItems.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + parseFloat(item.amount.toString()), 0);
  const netBudget = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Budget Management</h1>
            <p className="text-muted-foreground mt-1">
              Plan and track your annual budget
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Budget Item
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Budgeted Income</CardTitle>
                  <Target className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">₪{totalIncome.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{incomeItems.length} items</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Budgeted Expenses</CardTitle>
                  <Target className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">₪{totalExpenses.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{expenseItems.length} items</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Budget</CardTitle>
                  <Target className={`h-4 w-4 ${netBudget >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${netBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₪{netBudget.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {netBudget >= 0 ? 'Surplus' : 'Deficit'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Budget Items Tables */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Income Budget */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Income Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  {incomeItems.length > 0 ? (
                    <div className="space-y-2">
                      {incomeItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{item.description || 'Unnamed income'}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.frequency ? item.frequency.replace('_', ' ') : 'N/A'}
                              {item.category_name && ` • ${item.category_name}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-600">₪{parseFloat(item.amount.toString()).toFixed(2)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No income budget items</p>
                  )}
                </CardContent>
              </Card>

              {/* Expense Budget */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Expense Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  {expenseItems.length > 0 ? (
                    <div className="space-y-2">
                      {expenseItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{item.description || 'Unnamed expense'}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.frequency ? item.frequency.replace('_', ' ') : 'N/A'}
                              {item.category_name && ` • ${item.category_name}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-red-600">₪{parseFloat(item.amount.toString()).toFixed(2)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No expense budget items</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Budget Item' : 'Add Budget Item'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update the budget item details' : 'Create a new budget item for planning'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
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
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Monthly membership fees"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amount">Amount (₪)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.frequency || 'monthly'}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="one-time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
