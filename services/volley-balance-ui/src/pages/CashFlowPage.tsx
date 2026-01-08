import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { financialApi } from '@/api/financialApiClient';
import { CashFlowSummary } from '@/types/financial';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function CashFlowPage() {
  const [cashFlow, setCashFlow] = useState<CashFlowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadCashFlow();
  }, [selectedYear]);

  const loadCashFlow = async () => {
    try {
      setIsLoading(true);
      const data = await financialApi.getCashFlowSummary(selectedYear);
      setCashFlow(data);
    } catch (error) {
      console.error('Failed to load cash flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Cash Flow Statement</h1>
            <p className="text-muted-foreground mt-1">
              Weekly income, expenses, and running balance
            </p>
          </div>
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
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : cashFlow.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₪{cashFlow.reduce((sum, week) => sum + parseFloat(week.total_income.toString()), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    ₪{cashFlow.reduce((sum, week) => sum + parseFloat(week.total_expenses.toString()), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${cashFlow.reduce((sum, week) => sum + parseFloat(week.net_cash_flow.toString()), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₪{cashFlow.reduce((sum, week) => sum + parseFloat(week.net_cash_flow.toString()), 0).toFixed(2)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${parseFloat(cashFlow[cashFlow.length - 1]?.running_balance.toString() || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₪{parseFloat(cashFlow[cashFlow.length - 1]?.running_balance.toString() || '0').toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cash Flow Table */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Cash Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Week Starting</th>
                        <th className="text-right p-4 font-semibold">Income</th>
                        <th className="text-right p-4 font-semibold">Expenses</th>
                        <th className="text-right p-4 font-semibold">Net Cash Flow</th>
                        <th className="text-right p-4 font-semibold">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlow.map((week, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-4">{formatDate(week.week_start)}</td>
                          <td className="p-4 text-right text-green-600 font-medium">
                            ₪{parseFloat(week.total_income.toString()).toFixed(2)}
                          </td>
                          <td className="p-4 text-right text-red-600 font-medium">
                            ₪{parseFloat(week.total_expenses.toString()).toFixed(2)}
                          </td>
                          <td className={`p-4 text-right font-bold ${parseFloat(week.net_cash_flow.toString()) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₪{parseFloat(week.net_cash_flow.toString()).toFixed(2)}
                          </td>
                          <td className={`p-4 text-right font-bold ${parseFloat(week.running_balance.toString()) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₪{parseFloat(week.running_balance.toString()).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20">
              <p className="text-muted-foreground">No cash flow data for {selectedYear}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
