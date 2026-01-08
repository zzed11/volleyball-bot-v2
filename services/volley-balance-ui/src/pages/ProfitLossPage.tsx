import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { financialApi } from '@/api/financialApiClient';
import { ProfitLossStatement } from '@/types/financial';
import { Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProfitLossPage() {
  const [plData, setPlData] = useState<ProfitLossStatement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadProfitLoss();
  }, [selectedYear]);

  const loadProfitLoss = async () => {
    try {
      setIsLoading(true);
      const data = await financialApi.getProfitLossStatement(selectedYear);
      setPlData(data);
    } catch (error) {
      console.error('Failed to load P&L statement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const totalRevenue = plData.reduce((sum, month) => sum + parseFloat(month.revenue.toString()), 0);
  const totalExpenses = plData.reduce((sum, month) => sum + parseFloat(month.total_expenses.toString()), 0);
  const netProfit = plData.reduce((sum, month) => sum + parseFloat(month.net_profit.toString()), 0);

  const getMonthName = (monthNum: number): string => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[monthNum - 1] || '';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Profit & Loss Statement</h1>
            <p className="text-muted-foreground mt-1">
              Monthly revenue, expenses, and net profit analysis
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
        ) : plData.length > 0 ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">₪{totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Year to date</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">₪{totalExpenses.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Year to date</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                  <TrendingUp className={`h-4 w-4 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₪{netProfit.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {netProfit >= 0 ? 'Profit' : 'Loss'} ({totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}% margin)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* P&L Statement Table */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Month</th>
                        <th className="text-right p-4 font-semibold">Revenue</th>
                        <th className="text-right p-4 font-semibold">Hall Costs</th>
                        <th className="text-right p-4 font-semibold">Tournament Prizes</th>
                        <th className="text-right p-4 font-semibold">Equipment</th>
                        <th className="text-right p-4 font-semibold">Trainer</th>
                        <th className="text-right p-4 font-semibold">Treats</th>
                        <th className="text-right p-4 font-semibold">Other</th>
                        <th className="text-right p-4 font-semibold">Total Expenses</th>
                        <th className="text-right p-4 font-semibold">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plData.map((month, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{getMonthName(month.month_num)} {month.year}</td>
                          <td className="p-4 text-right text-green-600 font-medium">
                            ₪{parseFloat(month.revenue.toString()).toFixed(2)}
                          </td>
                          <td className="p-4 text-right">₪{parseFloat(month.hall_costs.toString()).toFixed(2)}</td>
                          <td className="p-4 text-right">₪{parseFloat(month.tournament_prizes.toString()).toFixed(2)}</td>
                          <td className="p-4 text-right">₪{parseFloat(month.equipment_costs.toString()).toFixed(2)}</td>
                          <td className="p-4 text-right">₪{parseFloat(month.trainer_costs.toString()).toFixed(2)}</td>
                          <td className="p-4 text-right">₪{parseFloat(month.treats_costs.toString()).toFixed(2)}</td>
                          <td className="p-4 text-right">₪{parseFloat(month.other_expenses.toString()).toFixed(2)}</td>
                          <td className="p-4 text-right text-red-600 font-medium">
                            ₪{parseFloat(month.total_expenses.toString()).toFixed(2)}
                          </td>
                          <td className={`p-4 text-right font-bold ${parseFloat(month.net_profit.toString()) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₪{parseFloat(month.net_profit.toString()).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="border-t-2 font-bold bg-muted/30">
                        <td className="p-4">TOTAL</td>
                        <td className="p-4 text-right text-green-600">₪{totalRevenue.toFixed(2)}</td>
                        <td className="p-4 text-right">
                          ₪{plData.reduce((sum, m) => sum + parseFloat(m.hall_costs.toString()), 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          ₪{plData.reduce((sum, m) => sum + parseFloat(m.tournament_prizes.toString()), 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          ₪{plData.reduce((sum, m) => sum + parseFloat(m.equipment_costs.toString()), 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          ₪{plData.reduce((sum, m) => sum + parseFloat(m.trainer_costs.toString()), 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          ₪{plData.reduce((sum, m) => sum + parseFloat(m.treats_costs.toString()), 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-right">
                          ₪{plData.reduce((sum, m) => sum + parseFloat(m.other_expenses.toString()), 0).toFixed(2)}
                        </td>
                        <td className="p-4 text-right text-red-600">₪{totalExpenses.toFixed(2)}</td>
                        <td className={`p-4 text-right ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₪{netProfit.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20">
              <p className="text-muted-foreground">No P&L data for {selectedYear}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
