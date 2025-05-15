import { LineChart } from 'react-native-chart-kit';
import { Dimensions, View } from 'react-native';
import { Text } from '~/components/ui/text';
import {I_Transaction} from "~/hooks/useTransactionHistory";
import {formatDate} from "~/utils";

export function TransactionHistoryChart({ transactions }: { transactions: I_Transaction[] }) {
  // Prepare data for the chart
  const chartData = transactions.map((tx) => ({
    // date: new Date(tx.timestamp).toLocaleDateString(),
    date: formatDate(tx.timestamp),
    amount: tx.amount,
  }));

  const labels = chartData.map((data) => data.date);
  const dataPoints = chartData.map((data) => data.amount);

  return (
    <View>
      <Text className="text-lg font-semibold mb-4">Transaction History</Text>
      {/*<LineChart
        bezier
        data={{
          labels,
          datasets: [{ data: dataPoints }],
        }}
        width={Dimensions.get('window').width - 40} // Adjust width
        height={220}
        yAxisLabel=""
        yAxisSuffix=" SOL"
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#f5f5f5',
          backgroundGradientTo: '#e3e3e3',
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        style={{
          borderRadius: 16,
        }}
      />*/}
    </View>
  );
}
