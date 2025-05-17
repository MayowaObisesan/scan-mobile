import BigNumber from 'bignumber.js';
import {Alert, Pressable, RefreshControl, ScrollView, TextInput, TouchableOpacity, View} from 'react-native'
import React, {useRef, useState} from 'react'
import {addWalletFromKeypair, deleteWallet, generateWallet, getFaucet, sendSol} from '~/solana/wallet'
import {Keypair, PublicKey} from '@solana/web3.js'
import {QrDisplay} from '~/components/QrDisplay'
import {createSolanaPayLink} from '~/services/solanaPay'
import {ConfirmAndSend} from '~/components/ConfirmAndSend'
import {Text} from '~/components/ui/text';
import {copyStringToClipboard, exportTransactionsToCSV, formatCurrency} from "~/utils";
import {Ionicons} from "@expo/vector-icons";
import {Button} from '~/components/ui/button';
import {ThemedView} from '~/components/ThemedView';
import {PageContainer, PageHeader, PageHeading} from "~/components/PageSection";
import {cn} from "~/lib/utils";
import {TransactionList} from '~/components/wallet/TransactionsList';
import {useTransactionHistory} from "~/hooks/useTransactionHistory";
import {useExchangeRates} from "~/hooks/useExchangeRates";
import {useTransactionNotifications} from '~/hooks/useTransactionNotification';
import {TransactionHistoryChart} from "~/components/wallet/TransactionHistoryChart";
import * as Sharing from 'expo-sharing';
// import {BottomSheetModal, BottomSheetScrollView} from "@gorhom/bottom-sheet";
import {BottomSheetComponent, BottomSheetContent, BottomSheetHeader, BottomSheetTitle} from '~/components/ui/bottom-sheet-component';
import {useWalletContext} from "~/contexts/WalletContext";
import {LucideEllipsisVertical} from "lucide-react-native";
import {Separator} from "~/components/ui/separator";
import { Badge } from '~/components/ui/badge';
import SolarShareIcon from "~/icon/ShareIcon";
import SolarCopyIcon from "~/icon/CopyIcon";
import SolarCardReceiveIcon from "~/icon/CardReceiveIcon";
import SolarCardSendIcon from "~/icon/CardSendIcon";
import SolarWalletIcon from "~/icon/WalletIcon";
import SolarTrashIcon from "~/icon/TrashIcon";
import SolarShieldIcon from "~/icon/ShieldIcon";
import SolarCheckCircleBoldDuotoneIcon from "~/icon/CheckCircleBoldDuotoneIcon";
import SolarWaterDropBoldDuotoneIcon from "~/icon/WaterDropBoldDuotoneIcon";
import SolarRefreshBoldDuotoneIcon from "~/icon/RefreshBoldDuotoneIcon";
import SolarShieldCheckIcon from "~/icon/ShieldCheckIcon";
import SolarPen2BoldDuotoneIcon from "~/icon/Pen2BoldDuotoneIcon";
import SolarUserBoldDuotoneIcon from "~/icon/UserBoldDuotoneIcon";
import {router} from "expo-router";
import SolarTagPriceIcon from "~/icon/TagPriceIcon";
import SolarScannerOutlineDuotoneIcon from "~/icon/ScannerOutlineDuotoneIcon";
import { toast } from 'sonner-native';
// import BottomSheet, { BottomSheetMethods } from '@devvie/bottom-sheet';


export default function WalletScreen() {
  // Polling for transaction notifications
  // const {activePubkey, activeWallet, loadWallets, selectWallet, refreshBalance, walletsList} = useWallets();
  const {activePubkey, activeWallet, loadWallets, selectWallet, refreshBalance, walletsList} = useWalletContext();
  const {
    transactions,
    isLoading: transactionHistoryLoading,
    refresh: transactionHistoryRefresh
  } = useTransactionHistory(activePubkey!)
  useTransactionNotifications(activePubkey!);
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'' | 'wallet' | 'receive' | 'sendPay'>('')
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Add state for transaction details modal
  const [selectedTx, setSelectedTx] = useState<any>(null);
  // State for backup wallet
  const [backupWallet, setBackupWallet] = useState<{ address: string; privateKey: string } | null>(null);
  // State for import wallet
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importKey, setImportKey] = useState('');
  const {rates, isLoading: ratesLoading} = useExchangeRates();
  const [selectedCurrency, setSelectedCurrency] = useState<'usd' | 'eur' | 'ngn' | 'gbp'>('usd');
  // State for transaction filtering
  const [filterType, setFilterType] = useState<'all' | 'send' | 'receive'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'pending' | 'failed'>('all');
  // State for transaction sorting
  const [sortCriteria, setSortCriteria] = useState<'date' | 'amount' | 'status'>('date');
  // State for transaction search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const transactionDetailsSheetRef = useRef(null);
  const backupWalletSheetRef = useRef(null);
  const importWalletSheetRef = useRef(null);
  const walletOptionsSheetRef = useRef(null);

  // const sheetRef = useRef<BottomSheetMethods>(null);
  // ref
  // const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // callbacks
  // const handlePresentModalPress = useCallback(() => {
  //   bottomSheetModalRef.current?.present();
  // }, []);

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (sortCriteria === 'date') {
      return b.timestamp - a.timestamp; // Newest first
    } else if (sortCriteria === 'amount') {
      return b.amount - a.amount; // Largest amount first
    } else if (sortCriteria === 'status') {
      return a.status.localeCompare(b.status); // Alphabetical order
    }
    return 0;
  });

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const convertToFiat = (solBalance: number, currency?: string) => {
    const rate = rates[currency || selectedCurrency] || 0;
    return (solBalance * rate).toFixed(2);
  };

  const payLink = activeWallet
    ? createSolanaPayLink(activeWallet.publicKey, BigNumber(0.01), 'ChatFi User', 'Send me 0.01 SOL', 'payment memo')
    : ''

  /*const loadWallets = async () => {
    const list = await getWallets()
    setWallets(list)
    setMyWallet(list[0])

    const active = await getActiveWallet()
    setActivePubkey(active?.publicKey.toBase58() ?? list[0]?.publicKey.toBase58())

    const updated: any = {}
    for (const wallet of list) {
      const balance = await getWalletBalance(wallet.publicKey)
      updated[wallet.publicKey.toBase58()] = balance
    }
    setBalances(updated)
  }*/

  const handleSelectWallet = async (pubkey: string) => {
    await selectWallet(pubkey)
  }

  const handleCreate = async () => {
    await generateWallet()
    await loadWallets()
  }

  const handleSend = async () => {
    try {
      const to = new PublicKey(recipient);
      const amountInLamports = parseFloat(amount);

      // Perform risk analysis
      /*await checkRiskBeforeSend({
        to: recipient,
        amount: amountInLamports,
      });*/

      // Proceed with sending SOL if no risk detected
      const tx = await sendSol(activeWallet!, to, amountInLamports);
      Alert.alert('Success', `TX: ${tx}`);
      loadWallets();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadWallets();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBackupWallet = async (wallet: { address: string; privateKey: string }) => {
    setBackupWallet(wallet);
  };

  const handleImportWallet = async () => {
    try {
      const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(importKey)));
      // Save the wallet (you may need to implement this in your wallet management logic)
      await addWalletFromKeypair(keypair);
      Alert.alert('Success', 'Wallet imported successfully!');
      setIsImportModalOpen(false);
      setImportKey('');
      await loadWallets();
    } catch (error) {
      Alert.alert('Error', 'Invalid private key or seed phrase');
    }
  };

  const searchedTransactions = transactions.filter((tx) => {
    const query = searchQuery.toLowerCase();
    return (
      tx.signature.toLowerCase().includes(query) ||
      tx.amount.toString().includes(query) ||
      tx.otherParty.toLowerCase().includes(query)
    );
  });

  const searchInput = () => {
    return (
      <View>
        {/* Search Input */}
        <TextInput
          placeholder="Search transactions"
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="mb-4 border border-border rounded-xl px-4"
        />

        {/* Searched Transactions */}
        <TransactionList
          transactions={searchedTransactions}
          isLoading={transactionHistoryLoading}
          onTransactionPress={(tx) => setSelectedTx(tx)}
        />
      </View>
    )
  }

  {/* Filter Options */
  }
  const filterSelectors = () => {
    return (
      <View className="flex flex-col justify-start gap-2 mb-4">
        <View className="flex-row gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'ghost'}
            onPress={() => setFilterType('all')}
          >
            <Text>All</Text>
          </Button>
          <Button
            variant={filterType === 'send' ? 'default' : 'ghost'}
            onPress={() => setFilterType('send')}
          >
            <Text>Send</Text>
          </Button>
          <Button
            variant={filterType === 'receive' ? 'default' : 'ghost'}
            onPress={() => setFilterType('receive')}
          >
            <Text>Receive</Text>
          </Button>
        </View>
        <View className="flex-row gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'ghost'}
            onPress={() => setFilterStatus('all')}
          >
            <Text>All</Text>
          </Button>
          <Button
            variant={filterStatus === 'confirmed' ? 'default' : 'ghost'}
            onPress={() => setFilterStatus('confirmed')}
          >
            <Text>Confirmed</Text>
          </Button>
          <Button
            variant={filterStatus === 'pending' ? 'default' : 'ghost'}
            onPress={() => setFilterStatus('pending')}
          >
            <Text>Pending</Text>
          </Button>
          <Button
            variant={filterStatus === 'failed' ? 'default' : 'ghost'}
            onPress={() => setFilterStatus('failed')}
          >
            <Text>Failed</Text>
          </Button>
        </View>
      </View>
    )
  }

  const sortSelectors = () => {
    return (
      <View>
        {/* Sorting Options */}
        <View className="flex-row justify-between mb-4">
          <Button
            variant={sortCriteria === 'date' ? 'default' : 'ghost'}
            onPress={() => setSortCriteria('date')}
          >
            <Text>Date</Text>
          </Button>
          <Button
            variant={sortCriteria === 'amount' ? 'default' : 'ghost'}
            onPress={() => setSortCriteria('amount')}
          >
            <Text>Amount</Text>
          </Button>
          <Button
            variant={sortCriteria === 'status' ? 'default' : 'ghost'}
            onPress={() => setSortCriteria('status')}
          >
            <Text>Status</Text>
          </Button>
        </View>

        {/* Sorted Transactions */}
        <TransactionList
          transactions={sortedTransactions}
          isLoading={transactionHistoryLoading}
          onTransactionPress={(tx) => setSelectedTx(tx)}
        />
      </View>
    )
  }

  const handleExportTransactions = async () => {
    try {
      const fileUri = await exportTransactionsToCSV(transactions);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Export Complete', `File saved to: ${fileUri}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export transactions');
    }
  };

  const exploreItems = [
    /*{ id: '1', title: 'Send', icon: 'send' },
    { id: '2', title: 'Receive', icon: 'download' },
    { id: '3', title: 'Pay', icon: 'card' },
    { id: '4', title: 'Scan', icon: 'scan' },*/
    { id: '1', title: 'Send', icon: <SolarCardSendIcon color={"#666"} height={40} width={40} /> },
    { id: '2', title: 'Receive', icon: <SolarCardReceiveIcon color={"#666"} height={40} width={40} /> },
    { id: '3', title: 'Pay', icon: <SolarTagPriceIcon color={"#666"} height={40} width={40} /> },
    { id: '4', title: 'Scan', icon: <SolarScannerOutlineDuotoneIcon color={"#666"} height={32} width={32} /> },
  ]

  const renderModeSelector = () => (
    <View className="mb-6">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-1 justify-between gap-4 px-2"
      >
        <Pressable
          className={cn(
            "items-center",
            mode === 'wallet' ? "opacity-100" : "opacity-70"
          )}
          // onPress={() => setMode('wallet')}
          onPress={() => router.push('/wallet')}
          style={({ pressed }) => [
            {
              transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
            },
          ]}
        >
          <View className={cn(
            "h-16 w-16 rounded-full items-center justify-center mb-2 shadow-md",
            mode === 'wallet' ? "bg-primary" : "bg-secondary"
          )}>
            {/*<Ionicons name="wallet" size={28} color={mode === 'wallet' ? "#fff" : "#333"} />*/}
            <SolarWalletIcon color={mode === 'wallet' ? "#fff" : "#333"} height={28} width={28} />
          </View>
          <Text className={cn(
            "text-sm font-medium",
            mode === 'wallet' ? "text-primary font-bold" : "text-gray-700"
          )}>Wallets</Text>
        </Pressable>

        <Pressable
          className={cn(
            "items-center",
            mode === 'receive' ? "opacity-100" : "opacity-70"
          )}
          // onPress={() => setMode('receive')}
          onPress={() => router.push('/wallet/receive')}
          style={({ pressed }) => [
            {
              transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
            },
          ]}
        >
          <View className={cn(
            "h-16 w-16 rounded-full items-center justify-center mb-2 shadow-md",
            mode === 'receive' ? "bg-primary" : "bg-secondary"
          )}>
            {/*<Ionicons name="download" size={28} color={mode === 'receive' ? "#fff" : "#333"} />*/}
            <SolarCardReceiveIcon color={mode === 'receive' ? "#fff" : "#333"} height={28} width={28} />
          </View>
          <Text className={cn(
            "text-sm font-medium",
            mode === 'receive' ? "text-primary font-bold" : "text-gray-700"
          )}>Receive</Text>
        </Pressable>

        <Pressable
          className={cn(
            "items-center",
            mode === 'sendPay' ? "opacity-100" : "opacity-70"
          )}
          // onPress={() => setMode('sendPay')}
          onPress={() => router.push('/wallet/send')}
          style={({ pressed }) => [
            {
              transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
            },
          ]}
        >
          <View className={cn(
            "h-16 w-16 rounded-full items-center justify-center mb-2 shadow-md",
            mode === 'sendPay' ? "bg-primary" : "bg-secondary"
          )}>
            {/*<Ionicons name="send" size={28} color={mode === 'sendPay' ? "#fff" : "#333"} />*/}
            <SolarCardSendIcon color={mode === 'sendPay' ? "#fff" : "#333"} height={28} width={28} />
          </View>
          <Text className={cn(
            "text-sm font-medium",
            mode === 'sendPay' ? "text-primary font-bold" : "text-gray-700"
          )}>Send</Text>
        </Pressable>
      </ScrollView>
    </View>
  );

  return (
    <PageContainer>
      <PageHeader className="mb-2">
        <View className="flex-row justify-between items-center w-full">
          <PageHeading className="font-bold">Wallet</PageHeading>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => {
                // Implement settings or help functionality
                // Alert.alert('Info', 'Wallet information and settings would go here');
                router.push("/wallet/home")
              }}
              className="h-10 w-10 bg-secondary/50 rounded-full items-center justify-center"
            >
              <Ionicons name="information-circle-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </PageHeader>

      <ScrollView
        contentContainerStyle={{padding: 20}}
        className={"bg-secondary/10"}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh}/>
        }
      >
        {/*<View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
          <Button title="💰 Wallets" onPress={() => setMode('wallet')}/>
          <Button title="📥 Receive" onPress={() => setMode('receive')}/>
          <Button title="📤 Send Pay URL" onPress={() => setMode('sendPay')}/>
        </View>*/}

        <View className={"my-8"}>
          <Text className="text-6xl font-black">
            {walletsList[0]?.balance ?? '...'}
          </Text>

          <View className={"flex-row items-center justify-between my-4"}>
            <Text className="text-xl font-semibold text-muted-foreground">SOL</Text>

            <View className="flex-row justify-end items-center">
              {/*<Text className="text-lg font-semibold">Select Currency</Text>*/}
              <View className="flex-row gap-2 bg-muted rounded-xl p-1">
                <Button
                  className={"rounded-xl"}
                  size={"sm"}
                  variant={selectedCurrency === 'usd' ? 'default' : 'ghost'}
                  onPress={() => setSelectedCurrency('usd')}
                >
                  <Text>USD</Text>
                </Button>
                <Button
                  className={"rounded-xl"}
                  size={"sm"}
                  variant={selectedCurrency === 'eur' ? 'default' : 'ghost'}
                  onPress={() => setSelectedCurrency('eur')}
                >
                  <Text>EUR</Text>
                </Button>
                <Button
                  className={"rounded-xl"}
                  size={"sm"}
                  variant={selectedCurrency === 'ngn' ? 'default' : 'ghost'}
                  onPress={() => setSelectedCurrency('ngn')}
                >
                  <Text>NGN</Text>
                </Button>
                <Button
                  className={"rounded-xl"}
                  size={"sm"}
                  variant={selectedCurrency === 'gbp' ? 'default' : 'ghost'}
                  onPress={() => setSelectedCurrency('gbp')}
                >
                  <Text>GBP</Text>
                </Button>
              </View>
            </View>
          </View>
        </View>

        {/* Display equivalent balance in local currency */}
        <View className="flex-row flex-wrap items-start gap-4 mb-12">
          {['usd', 'eur', 'ngn', 'gbp'].map(currency => (
            <Badge
              key={currency}
              className={cn(
                "px-2 py-1 border-0",
                selectedCurrency === currency ? "" : ""
              )}
              variant={"secondary"}
              onPress={() => setSelectedCurrency(currency as any)}
            >
              <Text className="text-lg font-bold">
                {/*{currency.toUpperCase()}: {convertToFiat(walletsList[0]?.balance ?? 0, currency)}*/}
                {formatCurrency(Number(convertToFiat(walletsList[0]?.balance ?? 0, currency)), currency.toUpperCase())}
              </Text>
            </Badge>
          ))}
        </View>

        {/*{renderModeSelector()}*/}

        <View className={"flex flex-row justify-around items-center gap-2 mb-8"}>
          {exploreItems.map((item) => (
            <Pressable
              key={item.id}
              className="items-center"
              onPress={() => {
                if (item.title === 'Scan') {
                  router.push('/scanner')
                } else if (item.title === "Pay") {
                  toast.info("Payment feature is coming soon.")
                } else {
                  router.push(`/wallet/${item.title.toLowerCase()}`)
                }
              }}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
                },
              ]}
            >
              <View className="h-20 w-20 bg-secondary rounded-2xl items-center justify-center mb-2 shadow-md">
                {/*<Ionicons name={item.icon as any} size={28} color="#333" />*/}
                {item.icon}
              </View>
              <Text className="text-sm font-medium text-gray-700">{item.title}</Text>
            </Pressable>
          ))}
        </View>

        <ThemedView>
          {/*<View className="flex flex-row justify-between items-center mt-4">
            <Text className={"text-2xl font-bold"}>Recent Transactions</Text>
            <Button className={"flex flex-row items-center gap-x-2"} size={"sm"} onPress={handleExportTransactions}>
              <Text><Ionicons name={'download-sharp'}/></Text>
              <Text>Export Transactions</Text>
            </Button>
          </View>*/}

          {transactions && <TransactionHistoryChart transactions={transactions}/>}

          {/*<TransactionList
            transactions={useTransactionHistory(wallet.address).transactions}
            isLoading={useTransactionHistory(wallet.address).isLoading}
            onTransactionPress={(tx) => setSelectedTx(tx)}
          />*/}

          <TransactionList
            transactions={filteredTransactions}
            isLoading={transactionHistoryLoading}
            onTransactionPress={(tx) => setSelectedTx(tx)}
          />
        </ThemedView>

        <BottomSheetComponent
          // ref={transactionDetailsSheetRef}
          open={!!selectedTx}
          onOpenChange={() => setSelectedTx(null)}
        >
          <BottomSheetContent>
            <BottomSheetHeader>
              <View className="flex-1 flex-row items-center justify-between">
                <BottomSheetTitle>
                  <Text className={""}>Transaction Details</Text>
                </BottomSheetTitle>
                <Pressable onPress={() => setSelectedTx(null)}>
                  <Ionicons name="close" size={22} color="#666" />
                </Pressable>
              </View>
            </BottomSheetHeader>
            {selectedTx && (
              <View className="py-2">
                <ThemedView className="p-4 rounded-lg">
                  {/* Transaction Hash */}
                  <View className="flex-row items-center mb-3">
                    <Text className="text-sm text-muted-foreground flex-1">Transaction Hash</Text>
                    <Pressable
                      onPress={() => {
                        copyStringToClipboard(selectedTx.signature);
                        toast.success('Copied to clipboard');
                      }}
                      className="ml-2"
                    >
                      {/*<Ionicons name="copy-outline" size={18} color="#666" />*/}
                      <SolarCopyIcon color="#666" />
                    </Pressable>
                  </View>
                  <Text className="font-mono text-xs mb-4" numberOfLines={1}>
                    {selectedTx.signature}
                  </Text>
                  <View className="h-[1px] bg-gray-100 my-2" />

                  {/* Amount */}
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name={selectedTx.type === 'receive' ? 'arrow-down-circle' : 'arrow-up-circle'}
                      size={20}
                      color={selectedTx.type === 'receive' ? '#10b981' : '#ef4444'}
                      className="mr-2"
                    />
                    <Text className="text-sm text-muted-foreground flex-1">Amount</Text>
                  </View>
                  <Text className="text-xl font-bold mb-2">
                    {selectedTx.amount.toFixed(4)} SOL
                  </Text>
                  <View className="h-[1px] bg-gray-100 my-2" />

                  {/* From/To */}
                  <Text className="text-sm text-muted-foreground mb-1">
                    {selectedTx.type === 'receive' ? 'From' : 'To'}
                  </Text>
                  <Text className="font-mono text-xs mb-4" numberOfLines={1}>
                    {selectedTx.otherParty}
                  </Text>
                  <View className="h-[1px] bg-gray-100 my-2" />

                  {/* Date */}
                  <Text className="text-sm text-muted-foreground mb-1">Date</Text>
                  <Text className="text-xs mb-4">
                    {new Date(selectedTx.timestamp * 1000).toLocaleString()}
                  </Text>
                  <View className="h-[1px] bg-gray-100 my-2" />

                  {/* Status */}
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        selectedTx.status === 'confirmed'
                          ? 'checkmark-circle'
                          : selectedTx.status === 'pending'
                          ? 'time'
                          : 'close-circle'
                      }
                      size={18}
                      color={
                        selectedTx.status === 'confirmed'
                          ? '#10b981'
                          : selectedTx.status === 'pending'
                          ? '#f59e42'
                          : '#ef4444'
                      }
                      className="mr-2"
                    />
                    <Text
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        selectedTx.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : selectedTx.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {selectedTx.status.toUpperCase()}
                    </Text>
                  </View>
                </ThemedView>
              </View>
            )}
          </BottomSheetContent>
        </BottomSheetComponent>

        {/*// Add transaction details modal at the bottom of your component:*/}
        {/*<Sheet open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Transaction Details</SheetTitle>
            </SheetHeader>
            {selectedTx && (
              <View className="py-4">
                <ThemedView className="p-4 rounded-lg">
                  <Text className="text-sm text-muted-foreground mb-2">Transaction Hash</Text>
                  <Text className="font-mono text-xs mb-4" numberOfLines={1}>
                    {selectedTx.signature}
                  </Text>

                  <Text className="text-sm text-muted-foreground mb-2">Amount</Text>
                  <Text className="text-xl font-bold mb-4">
                    {selectedTx.amount.toFixed(4)} SOL
                  </Text>

                  <Text className="text-sm text-muted-foreground mb-2">
                    {selectedTx.type === 'receive' ? 'From' : 'To'}
                  </Text>
                  <Text className="font-mono text-xs mb-4" numberOfLines={1}>
                    {selectedTx.otherParty}
                  </Text>

                  <Text className="text-sm text-muted-foreground mb-2">Status</Text>
                  <View className={`px-2 py-1 rounded-full w-fit ${
                    selectedTx.status === 'confirmed' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <Text className={
                      selectedTx.status === 'confirmed' ? 'text-green-700' : 'text-yellow-700'
                    }>
                      {selectedTx.status.toUpperCase()}
                    </Text>
                  </View>
                </ThemedView>
              </View>
            )}
          </SheetContent>
        </Sheet>*/}

        {/* Backup Modal */}
        {/*<BottomSheetComponent snapPoints={['25%', '50%', '90%']} ref={backupWalletSheetRef} open={!!backupWallet}
                              onOpenChange={() => setBackupWallet(null)}>
          <BottomSheetContent>
            <BottomSheetHeader>
              <BottomSheetTitle>Backup Wallet</BottomSheetTitle>
            </BottomSheetHeader>
            {backupWallet && (
              <View className="py-4">
                <Text className="text-sm text-muted-foreground mb-2">Wallet Address</Text>
                <Text className="font-mono text-xs mb-4">{backupWallet.address}</Text>

                <Text className="text-sm text-muted-foreground mb-2">Private Key</Text>
                <Text className="font-mono text-xs mb-4">{backupWallet.privateKey}</Text>

                <Button onPress={
                  () => copyStringToClipboard(backupWallet?.privateKey)
                    .then(() => {
                      Alert.alert('Copied', 'Private key copied to clipboard')
                    })
                }>
                  <Text>Copy Private Key</Text>
                </Button>
              </View>
            )}
          </BottomSheetContent>
        </BottomSheetComponent>*/}

        {/* Import Wallet Modal */}
        {/*<BottomSheetComponent snapPoints={['25%', '50%']} ref={importWalletSheetRef} open={isImportModalOpen}
                              onOpenChange={setIsImportModalOpen}>
          <BottomSheetContent>
            <BottomSheetHeader>
              <BottomSheetTitle>Import Wallet</BottomSheetTitle>
            </BottomSheetHeader>
            <View className="py-4">
              <TextInput
                placeholder="Enter private key or seed phrase"
                value={importKey}
                onChangeText={setImportKey}
                className="mb-4 border border-border rounded-xl px-4"
                multiline
              />
              <Button onPress={handleImportWallet}>
                <Text>Import</Text>
              </Button>
            </View>
          </BottomSheetContent>
        </BottomSheetComponent>*/}

        {/* WALLET OPTIONS */}
        {/*<BottomSheetComponent ref={walletOptionsSheetRef} snapPoints={["55%"]}>
          <BottomSheetContent>
            <BottomSheetHeader>
              <BottomSheetTitle>Wallet Options</BottomSheetTitle>
            </BottomSheetHeader>
            <ScrollView contentContainerClassName={"pb-8"} className="py-4">
              <View className="px-4 mb-6">
                <Text className="text-sm text-muted-foreground mb-4">
                  Manage your wallet settings and actions
                </Text>
              </View>

              <View className="px-2 mb-6">
                <Text className="font-semibold text-base mb-3">Quick Actions</Text>
                <View className="flex-row flex-wrap gap-3">
                  <TouchableOpacity
                    className="items-center bg-secondary/60 rounded-3xl px-2 py-4 w-[30%]"
                    onPress={() => {
                      // walletOptionsSheetRef.current?.dismiss();
                      refreshBalance(activePubkey!);
                    }}
                  >
                    <View className="h-12 w-12 bg-blue-100 rounded-full items-center justify-center mb-2">
                      <Ionicons name="refresh-outline" size={20} color="#0070f3" />
                      <SolarRefreshBoldDuotoneIcon color="#0070f3" />
                    </View>
                    <Text className="text-xs font-medium text-center">Refresh Balance</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="items-center bg-secondary/60 rounded-3xl px-2 py-4 w-[30%]"
                    onPress={() => {
                      // walletOptionsSheetRef.current?.dismiss();
                      getFaucet(activePubkey!);
                    }}
                  >
                    <View className="h-12 w-12 bg-green-100 rounded-full items-center justify-center mb-2">
                      <Ionicons name="water-outline" size={20} color="#10b981" />
                      <SolarWaterDropBoldDuotoneIcon color="#10b981" height={24} />
                    </View>
                    <Text className="text-xs font-medium text-center">Get Faucet</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="items-center bg-secondary/60 rounded-3xl px-2 py-4 w-[30%]"
                    onPress={() => {
                      // walletOptionsSheetRef.current?.dismiss();
                      if (activeWallet) {
                        handleBackupWallet({
                          address: activeWallet.publicKey.toBase58(),
                          privateKey: activeWallet.secretKey.toString()
                        });
                      }
                    }}
                  >
                    <View className="h-12 w-12 bg-purple-100 rounded-full items-center justify-center mb-2">
                      <Ionicons name="shield-outline" size={20} color="#8b5cf6" />
                      <SolarShieldCheckIcon color="#8b5cf6" height={24} />
                    </View>
                    <Text className="text-xs font-medium text-center">Backup Wallet</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Separator className="my-4" />

              <View className="px-2">
                <Text className="font-semibold text-base mb-3">Wallet Management</Text>

                <TouchableOpacity
                  className="flex-row items-center py-3 px-2"
                  onPress={() => {
                    // walletOptionsSheetRef.current?.dismiss();
                    copyStringToClipboard(activePubkey!).then(() => {
                      Alert.alert('Copied', 'Wallet address copied to clipboard');
                    });
                  }}
                >
                  <View className="h-10 w-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="copy-outline" size={18} color="#666" />
                    <SolarCopyIcon height={24} color="#666" />
                  </View>
                  <Text className="font-medium">Copy Wallet Address</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center py-3 px-2"
                  onPress={() => {
                    // walletOptionsSheetRef.current?.dismiss();
                    // Implement rename wallet functionality
                    Alert.alert('Rename Wallet', 'Rename wallet functionality would go here');
                  }}
                >
                  <View className="h-10 w-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="create-outline" size={18} color="#666" />
                    <SolarPen2BoldDuotoneIcon height={24} color="#666" />
                  </View>
                  <Text className="font-medium">Rename Wallet</Text>
                </TouchableOpacity>

                <Separator className="my-4" />

                <TouchableOpacity
                  className="flex-row items-center py-3 px-2"
                  onPress={() => {
                    // walletOptionsSheetRef.current?.dismiss();
                    Alert.prompt('Delete Wallet', 'Are you sure you want to delete this wallet?', (text) => {
                      Alert.alert('Deleted', `Wallet deleted`);
                      deleteWallet(activePubkey!);
                    });
                  }}
                >
                  <View className="h-10 w-10 bg-red-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <SolarTrashIcon height={24} color="#ef4444" />
                  </View>
                  <Text className="font-medium text-red-500">Delete Wallet</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </BottomSheetContent>
        </BottomSheetComponent>*/}

        {/*<BottomSheet
          detached
          backdropComponent={BottomSheetBackdrop}
          enablePanDownToClose={false}
          snapPoints={[200, '50%']}
          // ref={bottomSheetRef}
          // onChange={handleSheetChanges}
        >
          <BottomSheetView className={"flex-1 items-center p-8 bg-orange-500"}>
            <Text>Awesome 🎉</Text>
          </BottomSheetView>
        </BottomSheet>*/}

      </ScrollView>

      {/*<Button onPress={() => sheetRef.current?.open()}><Text>Open</Text></Button>
      <BottomSheet ref={sheetRef}>
        <Text>
          The smart 😎, tiny 📦, and flexible 🎗 bottom sheet your app craves 🚀
        </Text>
      </BottomSheet>*/}

      {/*<View>
        <Button
          onPress={handlePresentModalPress}
        >
          <Text>Present Modal</Text>
        </Button>
        <BottomSheetModal
          detached
          backdropComponent={BottomSheetBackdrop}
          bottomInset={8}
          enableDynamicSizing={true}
          index={0}
          snapPoints={[200, '50%']}
          stackBehavior={"replace"}
          ref={bottomSheetModalRef}
          // onChange={handleSheetChanges}
          style={{ marginHorizontal: 12 }}
        >
          <BottomSheetView className={"flex-1"}>
            <Text>Awesome 🎉</Text>
          </BottomSheetView>
        </BottomSheetModal>
      </View>*/}
    </PageContainer>
  )
}
