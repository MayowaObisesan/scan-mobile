import BigNumber from 'bignumber.js';
import {Alert, Pressable, RefreshControl, ScrollView, TextInput, TouchableOpacity, View} from 'react-native'
import React, {useRef, useState} from 'react'
import {addWalletFromKeypair, deleteWallet, generateWallet, getFaucet, sendSol} from '~/solana/wallet'
import {Keypair, PublicKey} from '@solana/web3.js'
import {QrDisplay} from '~/components/QrDisplay'
import {createSolanaPayLink} from '~/services/solanaPay'
import {ConfirmAndSend} from '~/components/ConfirmAndSend'
import {Text} from '~/components/ui/text';
import {copyStringToClipboard, exportTransactionsToCSV} from "~/utils";
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
  const [mode, setMode] = useState<'wallet' | 'receive' | 'sendPay'>('wallet')
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
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);

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
          onPress={() => setMode('wallet')}
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
      <PageHeader showBackButton className="mb-2">
        <View className="flex-row justify-between items-center w-full">
          <PageHeading className="text-2xl font-bold">Wallet Detail</PageHeading>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => {
                // Implement settings or help functionality
                Alert.alert('Info', 'Wallet information and settings would go here');
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

        {renderModeSelector()}

        {mode === 'wallet' && (
          <>
            {/*<Button
              className="mt-4"
              onPress={() => setIsImportModalOpen(true)}
            >
              <Text>Import Wallet</Text>
            </Button>
            <Text style={{fontWeight: 'bold', fontSize: 18}}>My Wallets</Text>*/}
            {/*<FlatList
              data={walletsList}
              keyExtractor={(eachWallet) => eachWallet.address}
              renderItem={({item}) => {
                const pubKey = item.address
                const selected = pubKey === activePubkey
                return (
                  <TouchableOpacity
                    onPress={() => handleSelectWallet(pubKey)}
                    style={{
                      marginVertical: 8,
                      gap: 8,
                      padding: 10,
                      backgroundColor: selected ? '#dfffea' : '#f2f2f2',
                      borderRadius: 10,
                      borderColor: selected ? 'green' : '#ccc',
                      borderWidth: 1
                    }}
                  >
                    <Text numberOfLines={1}>{pubKey}</Text>
                    <Text style={{fontWeight: 'bold'}}>
                      Balance: {item.balance ?? '...'}
                    </Text>
                    {selected && <Text style={{color: 'green'}}>✓ Active</Text>}
                    <Button title={"Get Faucet"} onPress={() => getFaucet(pubKey)}/>
                      Copy address button
                    <Button
                      title="Copy Address"
                      onPress={() => {
                        copyStringToClipboard(pubKey).then(() => {
                          Alert.alert('Copied', `Address ${pubKey} copied to clipboard`)
                        });
                      }}
                    />
                      Delete wallet button
                    <Button
                      title="Delete Wallet"
                      onPress={() => {
                        // Handle wallet deletion logic here
                        Alert.alert('Deleted', `Wallet ${pubKey} deleted`)
                      }}
                    />
                      Refresh wallet balance button
                    <Button
                      title="Refresh Balance"
                      onPress={() => {
                        // Handle wallet balance logic here
                        refreshBalance(pubKey).then(() => {
                          Alert.alert('Balance updated', `Wallet ${pubKey} balance updated`)
                        });
                      }}
                    />
                  </TouchableOpacity>
                )
              }}
            />*/}

            <View className={"my-8"}>
              <Text className="text-6xl font-black">
                {walletsList[0]?.balance ?? '...'}
              </Text>
              <Text className="text-xl font-semibold text-muted-foreground">SOL</Text>
            </View>

            <View className="flex-row justify-end items-center my-8">
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

            {/*<TouchableOpacity className={""}>
              <View className={"relative gap-y-6 px-6 py-6 rounded-xl bg-green-500/10 border-0 border-green-400"}>
                <Button
                  className={"absolute top-4 right-4 rounded-full"}
                  size={"icon"}
                  variant={"ghost"}
                  onPress={() => walletOptionsSheetRef.current?.present()}
                >
                  <LucideEllipsisVertical color={"gray"} size={"18"} />
                </Button>
                <View className={"relative"}>
                  <Text className={"font-semibold text-xl"}>{"Wallet Name"}</Text>
                  <Text className={"relative font-semibold text-lg text-muted-foreground"}>
                    {"EDG2...123H"}
                    <Button
                        className={"color-inherit absolute"}
                        size="icon"
                        variant="ghost"
                        onPress={() => {
                          copyStringToClipboard(wallet.address).then(() => {
                            Alert.alert('Copied', 'Address copied to clipboard');
                          });
                        }}
                    >
                      <Ionicons color={"inherit"} name="copy" size={14}/>
                    </Button>
                  </Text>
                </View>
                <View>
                  <View className={"flex flex-row items-baseline gap-x-2"}>
                    <Text className={"font-bold text-3xl text-muted-foreground"}>$</Text>
                    <Text className={"font-extrabold text-5xl leading-none"}>{"230,456"}</Text>
                    <Text className={"font-bold text-2xl text-muted-foreground leading-none"}>{"NGN"}</Text>
                  </View>
                  <View className={"flex flex-row items-baseline gap-x-1"}>
                    <Text className={"text-2xl"}>≈</Text>
                    <Text className={"font-semibold text-3xl"}>{"0.5"}</Text>
                    <Text className={"text-lg text-muted-foreground"}>{"SOL"}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>*/}

            <View className={"gap-y-3"}>
              {walletsList.map((wallet, index) => (
                <TouchableOpacity
                  key={wallet.address}
                  onPress={() => handleSelectWallet(wallet.address)}
                  className={cn(
                    "px-4 pt-4 pb-2 rounded-2xl overflow-hidden",
                    activePubkey === wallet.address ? "border border-muted" : "border border-muted",
                  )}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.9 : 1,
                      transform: pressed ? [{ scale: 0.99 }] : [{ scale: 1 }],
                    },
                  ]}
                >
                  <View className={cn(
                    "",
                    activePubkey === wallet.address
                      ? ""
                      : "bg-background"
                  )}>
                    <View className={"flex flex-row items-baseline gap-x-2"}>
                      <Text className="text-3xl font-black">
                        {wallet.balance ?? '...'}
                      </Text>
                      <Text className="text-xl font-semibold text-muted-foreground">SOL</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-x-3">
                        <View className={cn(
                          "h-10 w-10 rounded-full items-center justify-center",
                          activePubkey === wallet.address ? "bg-primary" : "bg-secondary"
                        )}>
                          <Text className={cn(
                            "text-lg font-bold",
                            activePubkey === wallet.address ? "text-white" : "text-secondary-foreground"
                          )}>
                            {(walletsList.indexOf(wallet) + 1).toString()}
                          </Text>
                        </View>
                        <View className={"flex flex-row items-center gap-x-3 py-3"}>
                          <Text className="text-lg font-semibold">
                            Wallet {walletsList.indexOf(wallet) + 1}
                          </Text>
                          {activePubkey === wallet.address && (
                            <Button size="sm" className="flex flex-row items-center gap-x-2 bg-primary rounded-xl" onPress={() => selectWallet(wallet.address)}>
                              {/*<Ionicons name="checkmark-circle-outline" size={16} color="#fff" className="mr-1" />*/}
                              <SolarCheckCircleBoldDuotoneIcon color="#fff" />
                              <Text className="text-sm text-white">Active</Text>
                            </Button>
                            /*<Badge className="bg-secondary-foreground border-0 px-2 py-0">
                              <Text className="text-xs">Active</Text>
                            </Badge>*/
                          )}
                        </View>
                      </View>

                      <View className="flex-row">
                        <Button
                          size="icon"
                          variant="ghost"
                          // onPress={() => walletOptionsSheetRef.current?.present()}
                          onPress={() => setShowOptionsSheet(true)}
                        >
                          <Ionicons name="ellipsis-vertical" size={20} />
                        </Button>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-x-2 mb-2">
                      <Text className="text-sm text-muted-foreground font-medium" numberOfLines={1}>
                        {wallet.address.substring(0, 12)}...{wallet.address.substring(wallet.address.length - 6)}
                      </Text>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onPress={() => {
                          copyStringToClipboard(wallet.address).then(() => {
                            Alert.alert('Copied', 'Address copied to clipboard');
                          });
                        }}
                      >
                        {/*<Ionicons name="copy-outline" size={14} />*/}
                        <SolarCopyIcon color={"gray"} />
                      </Button>
                    </View>
                  </View>

                  <View className="pt-6">
                    <View className="flex-row items-baseline gap-x-2 mb-2">
                      <Text className="text-3xl font-black">
                        {wallet.balance ?? '...'}
                      </Text>
                      <Text className="text-xl font-semibold text-muted-foreground">SOL</Text>
                      {/*<Button
                        className="h-8 w-8 self-center"
                        disabled={isRefreshing}
                        size={"icon"}
                        variant={"secondary"}
                        onPress={() => refreshBalance(wallet.address)}
                      >
                        <SolarRefreshBoldDuotoneIcon
                          className={isRefreshing ? 'animate-spin' : ''}
                          color={isRefreshing ? '#999' : '#333'}
                          height={20}
                        />
                      </Button>*/}
                      {/*<TouchableOpacity
                        onPress={() => refreshBalance(wallet.address)}
                        disabled={isRefreshing}
                        className="ml-2"
                      >
                        <Ionicons
                          name="refresh-outline"
                          size={18}
                          color={isRefreshing ? "#999" : "#333"}
                          className={isRefreshing ? 'animate-spin' : ''}
                        />
                      </TouchableOpacity>*/}
                    </View>

                    {/* Display equivalent balance in local currency */}
                    <View className="flex-row flex-wrap gap-2 mb-4">
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
                          <Text className="text-sm font-medium">
                            {currency.toUpperCase()}: {convertToFiat(wallet.balance ?? 0, currency)}
                          </Text>
                        </Badge>
                      ))}
                    </View>

                    <View className="flex-row flex-wrap justify-between gap-2 mt-2">
                      <View className="flex-row gap-2">
                        {/*{!activePubkey || activePubkey !== wallet.address ? (
                          <Button size="sm" className="flex flex-row items-center gap-x-2 bg-primary rounded-xl" onPress={() => selectWallet(wallet.address)}>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" className="mr-1" />
                            <SolarCheckCircleBoldDuotoneIcon color="#fff" />
                            <Text className="text-white">Set Active</Text>
                          </Button>
                        ) : null}*/}
                        {/*<Button size="sm" variant="outline" onPress={() => getFaucet(wallet.address)}>
                          <Ionicons name="water-outline" size={16} className="mr-1" />
                          <SolarWaterDropBoldDuotoneIcon color="#333" />
                          <Text>Get Faucet</Text>
                        </Button>*/}
                      </View>

                      <View className="hidden flex-row gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onPress={() => getFaucet(wallet.address)}
                        >
                          {/*<Ionicons name="water-outline" size={16} className="mr-1" />*/}
                          <SolarWaterDropBoldDuotoneIcon color="#333" />
                          {/*<Text>Get Faucet</Text>*/}
                        </Button>
                        <Button
                          className={"rounded-full"}
                          size="icon"
                          variant="ghost"
                          onPress={() => handleBackupWallet({
                            address: wallet.address,
                            privateKey: wallet.keypair.secretKey.toString()
                          })}
                        >
                          {/*<Ionicons name="shield-outline" size={16} className="mr-1" />*/}
                          <SolarShieldIcon color={"#333"} />
                          {/*<Text>Backup</Text>*/}
                        </Button>

                        <Button
                          className={"flex flex-row items-center gap-x-1 px-2 rounded-full"}
                          size="icon"
                          variant="ghost"
                          onPress={() => Alert.prompt('Delete Wallet', 'Are you sure you want to delete this wallet?', (text) => {
                            Alert.alert('Deleted', `Wallet ${wallet.address} deleted`)
                            deleteWallet(wallet.address)
                          })}
                        >
                          {/*<Ionicons name="trash-outline" size={16} className="mr-1" />*/}
                          <SolarTrashIcon color={"tomato"} />
                          {/*<Text>Delete</Text>*/}
                        </Button>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              className="mt-4 mb-8 border-2 border-dashed border-primary/30 rounded-2xl p-5 items-center justify-center"
              style={({ pressed }) => [
                {
                  backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                },
              ]}
            >
              <View className="h-16 w-16 bg-primary/10 rounded-full items-center justify-center mb-3">
                <Ionicons name="add" size={32} color="#0070f3" />
              </View>
              <Text className="text-lg font-semibold text-primary">Create New Wallet</Text>
              <Text className="text-sm text-muted-foreground text-center mt-1">
                Add a new wallet to manage your assets
              </Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'receive' && activeWallet && (
          <View className="px-4 py-6 bg-white rounded-2xl mb-8">
            <View className="items-center mb-6">
              <Text className="text-2xl font-bold mb-2">Receive SOL</Text>
              <Text className="text-muted-foreground text-center mb-4">
                Scan this QR code to receive SOL via Solana Pay
              </Text>

              <View className="bg-muted p-6 rounded-3xl mb-4">
                <QrDisplay value={payLink} label="Receive via Solana Pay" />
              </View>

              <View className="w-full bg-secondary/20 rounded-xl p-4 mb-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-medium text-muted-foreground">Your wallet address</Text>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onPress={() => {
                      copyStringToClipboard(activeWallet.publicKey.toBase58()).then(() => {
                        Alert.alert('Copied', 'Wallet address copied to clipboard');
                      });
                    }}
                  >
                    {/*<Ionicons name="copy-outline" size={16} />*/}
                    <SolarCopyIcon color={"gray"} />
                  </Button>
                </View>
                <Text className="font-mono text-base mt-1" numberOfLines={1}>
                  {activeWallet.publicKey.toBase58()}
                </Text>
              </View>

              <View className="flex-row gap-4 mt-2">
                <Button
                  className="flex-1 flex-row items-center gap-x-1"
                  onPress={() => {
                    copyStringToClipboard(payLink).then(() => {
                      Alert.alert('Copied', 'Solana Pay link copied to clipboard');
                    });
                  }}
                >
                  {/*<Text><Ionicons name="copy-outline" size={16} className="mr-2" /></Text>*/}
                  <SolarCopyIcon color={"white"} />
                  <Text>Copy Pay Link</Text>
                </Button>
                <Button
                  className="flex-1 flex flex-row items-center gap-x-2"
                  variant="secondary"
                  onPress={() => {
                    // Share functionality would go here
                    Alert.alert('Share', 'Share functionality would go here');
                  }}
                >
                  {/*<Ionicons name="share-outline" size={16} className="mr-2" />*/}
                  <SolarShareIcon color={"#2563EBE6"} />
                  <Text>Share</Text>
                </Button>
              </View>
            </View>
          </View>
        )}

        {mode === 'sendPay' && (
          <View className="px-4 py-6 bg-white rounded-2xl mb-8">
            <View className="items-center mb-6">
              <Text className="text-2xl font-bold mb-2">Send SOL</Text>
              <Text className="text-sm text-muted-foreground text-center mb-4">
                Send SOL to another wallet address
              </Text>
            </View>

            <View className="gap-y-2 mb-8">
              <Text className="text-sm font-medium text-muted-foreground mb-2">Recipient</Text>
              <View className="flex-row items-center bg-secondary rounded-2xl px-4 py-3 mb-4">
                {/*<Ionicons name="person-outline" size={20} color="#666" className="mr-2" />*/}
                <SolarUserBoldDuotoneIcon color={"#666"} height={20} />
                <TextInput
                  placeholder="Solana address or pay URL"
                  value={recipient}
                  onChangeText={setRecipient}
                  className="flex-1 h-12 text-base"
                  placeholderTextColor="#999"
                />
                {recipient.length > 0 && (
                  <TouchableOpacity onPress={() => setRecipient('')}>
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              <Text className="text-sm font-medium text-muted-foreground mb-2">Amount</Text>
              <View className="flex-row items-center bg-secondary rounded-2xl px-4 py-3 mb-6">
                <Ionicons name="cash-outline" size={20} color="#666" className="mr-2" />
                <TextInput
                  placeholder="Amount in SOL"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  className="flex-1 h-12 text-base"
                  placeholderTextColor="#999"
                />
                <Text className="font-medium text-muted-foreground">SOL</Text>
              </View>

              {amount && (
                <View className="bg-secondary/10 p-3 rounded-xl mb-6">
                  <Text className="text-sm text-center text-muted-foreground">
                    ≈ {convertToFiat(parseFloat(amount) || 0)} {selectedCurrency.toUpperCase()}
                  </Text>
                </View>
              )}

              <Button
                className="flex flex-row items-center py-4"
                onPress={handleSend}
                disabled={!recipient || !amount}
              >
                <Ionicons name="paper-plane" size={18} color="#fff" className="mr-2" />
                <Text className="text-white font-semibold">Send Now</Text>
              </Button>

              {/*<ConfirmAndSend
                to="Fg6PaFpoGXkY..."
                amount={0.01}
                onConfirm={async () => {
                  const tx = await sendSol(activeWallet!, new PublicKey(recipient), 0.01)
                  Alert.alert('Success', `Tx hash: ${tx}`)
                }}
              />*/}

              <Text className="font-medium text-xs text-foreground text-center mt-4">
                Please verify the recipient address before sending
              </Text>
            </View>

            {activeWallet && (
              <View className="gap-y-2 border-t border-gray-100 pt-8">
                <Text className="text-sm font-medium text-muted-foreground mb-2">Sending from</Text>
                <View className="flex-row items-center justify-between bg-secondary rounded-2xl p-4">
                  <View className="flex-row items-center">
                    {/*<View className="h-8 w-8 bg-primary/20 rounded-full items-center justify-center mr-2">
                      <Text className="font-bold">{activeWallet.publicKey.toBase58().substring(0, 1)}</Text>
                    </View>*/}
                    <View>
                      <Text className="font-medium text-sm">Active Wallet</Text>
                      <Text className="text-lg text-muted-foreground" numberOfLines={1}>
                        {activeWallet.publicKey.toBase58().substring(0, 10)}...
                      </Text>
                    </View>
                  </View>
                  <Text className="font-semibold">{walletsList.find(it => it.address === activeWallet.publicKey.toBase58())?.balance} SOL</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {mode === "wallet" && <ThemedView>
            <View className="flex flex-row justify-between items-center mt-4">
                <Text className={"text-2xl font-bold"}>Recent Transactions</Text>
                <Button className={"flex flex-row items-center gap-x-2"} size={"sm"} onPress={handleExportTransactions}>
                    <Text><Ionicons name={'download-sharp'}/></Text>
                    <Text>Export Transactions</Text>
                </Button>
            </View>

          {transactions && <TransactionHistoryChart transactions={transactions}/>}

          {/*<TransactionList
            transactions={useTransactionHistory(wallet.address).transactions}
            isLoading={useTransactionHistory(wallet.address).isLoading}
            onTransactionPress={(tx) => setSelectedTx(tx)}
          />*/}

          {/*<TransactionList
            transactions={filteredTransactions}
            isLoading={transactionHistoryLoading}
            onTransactionPress={(tx) => setSelectedTx(tx)}
          />*/}
        </ThemedView>}

        <BottomSheetComponent
          // ref={transactionDetailsSheetRef}
          open={!!selectedTx}
          onOpenChange={() => setSelectedTx(null)}
        >
          <BottomSheetContent>
            <BottomSheetHeader>
              <BottomSheetTitle>Transaction Details</BottomSheetTitle>
            </BottomSheetHeader>
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
        <BottomSheetComponent
          snapPoints={[25, 50, 90]}
          // ref={backupWalletSheetRef}
          open={!!backupWallet}
          onOpenChange={() => setBackupWallet(null)}
        >
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
        </BottomSheetComponent>

        {/* Import Wallet Modal */}
        <BottomSheetComponent
          snapPoints={[25, 50]}
          // ref={importWalletSheetRef}
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
        >
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
        </BottomSheetComponent>

        {/* WALLET OPTIONS */}
        <BottomSheetComponent open={showOptionsSheet} onOpenChange={() => setShowOptionsSheet(false)} snapPoints={[55]}>
          <BottomSheetContent>
            <BottomSheetHeader>
              <BottomSheetTitle>Wallet Options</BottomSheetTitle>
            </BottomSheetHeader>
            <ScrollView contentContainerClassName={"pb-8"} className="py-4">
              {/*<View className="px-4 mb-6">
                <Text className="text-sm text-muted-foreground mb-4">
                  Manage your wallet settings and actions
                </Text>
              </View>*/}

              <View className="px-2 mb-6">
                {/*<Text className="font-semibold text-base mb-3">Quick Actions</Text>*/}
                <View className="flex-row flex-wrap gap-3">
                  <TouchableOpacity
                    className="items-center bg-secondary/60 rounded-3xl px-2 py-4 w-[30%]"
                    onPress={() => {
                      // walletOptionsSheetRef.current?.dismiss();
                      refreshBalance(activePubkey!);
                    }}
                  >
                    <View className="h-12 w-12 bg-blue-100 rounded-full items-center justify-center mb-2">
                      {/*<Ionicons name="refresh-outline" size={20} color="#0070f3" />*/}
                      <SolarRefreshBoldDuotoneIcon color="#0070f3" />
                    </View>
                    <Text className="text-xs font-medium text-center">Refresh Balance</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="items-center bg-secondary/60 rounded-3xl px-2 py-4 w-[30%]"
                    onPress={() => {
                      walletOptionsSheetRef.current?.dismiss();
                      getFaucet(activePubkey!);
                    }}
                  >
                    <View className="h-12 w-12 bg-green-100 rounded-full items-center justify-center mb-2">
                      {/*<Ionicons name="water-outline" size={20} color="#10b981" />*/}
                      <SolarWaterDropBoldDuotoneIcon color="#10b981" height={24} />
                    </View>
                    <Text className="text-xs font-medium text-center">Get Faucet</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="items-center bg-secondary/60 rounded-3xl px-2 py-4 w-[30%]"
                    onPress={() => {
                      walletOptionsSheetRef.current?.dismiss();
                      if (activeWallet) {
                        handleBackupWallet({
                          address: activeWallet.publicKey.toBase58(),
                          privateKey: activeWallet.secretKey.toString()
                        });
                      }
                    }}
                  >
                    <View className="h-12 w-12 bg-purple-100 rounded-full items-center justify-center mb-2">
                      {/*<Ionicons name="shield-outline" size={20} color="#8b5cf6" />*/}
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
                    walletOptionsSheetRef.current?.dismiss();
                    copyStringToClipboard(activePubkey!).then(() => {
                      Alert.alert('Copied', 'Wallet address copied to clipboard');
                    });
                  }}
                >
                  <View className="h-10 w-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                    {/*<Ionicons name="copy-outline" size={18} color="#666" />*/}
                    <SolarCopyIcon height={24} color="#666" />
                  </View>
                  <Text className="font-medium">Copy Wallet Address</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center py-3 px-2"
                  onPress={() => {
                    walletOptionsSheetRef.current?.dismiss();
                    // Implement rename wallet functionality
                    Alert.alert('Rename Wallet', 'Rename wallet functionality would go here');
                  }}
                >
                  <View className="h-10 w-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                    {/*<Ionicons name="create-outline" size={18} color="#666" />*/}
                    <SolarPen2BoldDuotoneIcon height={24} color="#666" />
                  </View>
                  <Text className="font-medium">Rename Wallet</Text>
                </TouchableOpacity>

                <Separator className="my-4" />

                <TouchableOpacity
                  className="flex-row items-center py-3 px-2"
                  onPress={() => {
                    walletOptionsSheetRef.current?.dismiss();
                    Alert.prompt('Delete Wallet', 'Are you sure you want to delete this wallet?', (text) => {
                      Alert.alert('Deleted', `Wallet deleted`);
                      deleteWallet(activePubkey!);
                    });
                  }}
                >
                  <View className="h-10 w-10 bg-red-100 rounded-full items-center justify-center mr-3">
                    {/*<Ionicons name="trash-outline" size={18} color="#ef4444" />*/}
                    <SolarTrashIcon height={24} color="#ef4444" />
                  </View>
                  <Text className="font-medium text-red-500">Delete Wallet</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </BottomSheetContent>
        </BottomSheetComponent>

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
