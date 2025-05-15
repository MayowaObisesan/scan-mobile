// components/wallet/TransactionList.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '~/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '~/components/ThemedView';

interface TransactionListProps {
  transactions: any[];
  isLoading: boolean;
  onTransactionPress: (tx: any) => void;
}

export function TransactionList({ transactions, isLoading, onTransactionPress }: TransactionListProps) {
  if (isLoading) {
    return (
      <View className="py-4">
        <Text className="text-center text-muted-foreground">Loading transactions...</Text>
      </View>
    );
  }

  if (!transactions.length) {
    return (
      <View className="py-4">
        <Text className="text-center text-muted-foreground">No transactions found</Text>
      </View>
    );
  }

  return (
    <View>
      {transactions.map((tx) => (
        <TouchableOpacity
          key={tx.signature}
          onPress={() => onTransactionPress(tx)}
          className="mb-2"
        >
          <ThemedView className="p-3 rounded-lg flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center mr-3">
                <Ionicons
                  name={tx.type === 'receive' ? 'arrow-down' : 'arrow-up'}
                  size={16}
                  color={tx.type === 'receive' ? 'green' : 'red'}
                />
              </View>
              <View>
                <Text className="font-medium">
                  {tx.type === 'receive' ? 'Received' : 'Sent'}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {new Date(tx.timestamp * 1000).toLocaleString()}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className={`font-bold ${
                tx.type === 'receive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {tx.type === 'receive' ? '+' : '-'}{tx.amount.toFixed(4)} SOL
              </Text>
              <Text className="text-xs text-muted-foreground">
                {tx.status}
              </Text>
            </View>
          </ThemedView>
        </TouchableOpacity>
      ))}
    </View>
  );
}
