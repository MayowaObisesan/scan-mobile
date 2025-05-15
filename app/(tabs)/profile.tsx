import React from 'react'
import {ActivityIndicator, ScrollView, View} from 'react-native'
import {Text} from '~/components/ui/text'
import {useSyncProfile} from '~/hooks/useSyncProfile'
import {Button} from '~/components/ui/button'
import {Avatar, AvatarFallback, AvatarImage} from '~/components/ui/avatar'
import {PageBody, PageContainer, PageHeader, PageHeading} from '~/components/PageSection'
import {Ionicons} from "@expo/vector-icons";
import {useContactInfo} from '~/hooks/useContacts'
import {shortenAddress} from "~/utils";
import {Link, router} from "expo-router";
import {ProfileSkeleton} from "~/components/skeleton/profileSkeleton";
import {ListSection} from "~/components/ListSection";
import {useProfileContext} from "~/contexts/ProfileContext";
import {useAuthContext} from "~/contexts/AuthContext";
import {useWalletContext} from "~/contexts/WalletContext";
import SolarSettingsDuotoneIcon from "~/icon/SettingsDuotoneIcon";
import SolarPen2BoldDuotoneIcon from "~/icon/Pen2BoldDuotoneIcon";

export default function ProfileScreen() {
    const {user} = useAuthContext();
    // const {user} = useAuth()
    // const {data: profile, isLoading: profileLoading, error: profileError, refetch} = useProfile(user?.id!)
    const {
        profile,
        isLoading: profileLoading,
        error: profileError,
        refetch: profileRefetch,
        avatar: profileEmoji
    } = useProfileContext();
    const {data: contactInfo} = useContactInfo(profile?.phone!)
    // const {balances, activeWallet, walletsList} = useWallets();
    const {balances, activeWallet, walletsList} = useWalletContext();
    useSyncProfile(user?.id!)
    // const { emoji: localEmoji } = useEmojiAvatar()

    console.log("Profile ERROR::", profileError);

    return (
        <PageContainer fallback={<ProfileSkeleton/>}>
            <PageHeader className={""}>
                <View className={"flex-row justify-between items-center w-full h-full"}>
                    <PageHeading className={""}>
                        Hey, Me 👋
                    </PageHeading>
                    <Link href={"/settings"}>
                        {/*<Ionicons name={"settings"} size={24}/>*/}
                        <SolarSettingsDuotoneIcon color={"gray"} />
                    </Link>
                </View>
            </PageHeader>

            <PageBody>
                {profileLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large"/>
                    </View>
                /*) : profileError ? (
                    <View className="flex-1 items-center justify-center p-4">
                        <Text className="text-red-500">Failed to load profile</Text>
                        <Button onPress={() => profileRefetch()}>
                            <Text>Retry</Text>
                        </Button>
                    </View>*/
                ) : (
                    <ScrollView
                        contentContainerClassName={"gap-y-20 p-5"}
                        className="flex-1 flex flex-col bg-secondary/30"
                    >
                        <View className="items-center gap-y-2">
                            <Link href={"/profile/dp"} className="mb-4">
                                <View className={"relative"}>
                                    <Avatar alt="Profile Avatar" className="w-48 h-48">
                                        <AvatarImage
                                            source={{uri: profileEmoji.emoji ? profile?.avatar_url ?? undefined : ""}}/>
                                        <AvatarFallback>
                                            {/*<Text>{formData.username?.charAt(0)?.toUpperCase()}</Text>*/}
                                            <Text className="h-full align-middle text-8xl">
                                                {profileEmoji.emoji || profile?.username?.charAt(0)?.toUpperCase()}
                                            </Text>
                                        </AvatarFallback>
                                    </Avatar>
                                    <Button
                                      className={"absolute bottom-2 right-2 z-10 w-12 h-12 rounded-full border-2 border-border"}
                                      size={"icon"}
                                      variant={"secondary"}
                                      onPress={() => router.push("/profile/dp")}
                                    >
                                        <SolarPen2BoldDuotoneIcon color={"gray"} />
                                    </Button>
                                </View>
                            </Link>

                            <Text className="font-bold text-3xl">{profile?.username}</Text>
                            <Text className="font-semibold text-lg text-muted-foreground">+{profile?.phone}</Text>
                        </View>

                        <View className={"gap-y-12"}>
                            <ListSection
                                title="About"
                                items={[
                                    {
                                        type: 'single',
                                        label: 'Username',
                                        value: profile?.username,
                                        href: '/profile/username'
                                    },
                                    {
                                        type: 'double',
                                        label: 'Bio',
                                        value: profile?.bio || "You are a ...",
                                        subtitle: "Tell us about yourself",
                                        href: '/profile/bio'
                                    }
                                ]}
                            />

                            <ListSection
                                title="Wallets"
                                items={[
                                    {
                                        type: 'single',
                                        label: 'No of Wallets',
                                        value: walletsList?.length,
                                    },
                                    {
                                        type: 'single',
                                        label: 'Active Wallet',
                                        value: shortenAddress(activeWallet?.publicKey.toJSON()!)
                                    },
                                    {
                                        type: 'single',
                                        label: 'Total Balance',
                                        value: Object.values(balances).reduce((sum, val) => sum + val, 0) + "SOL",
                                    }
                                ]}
                            />

                            <ListSection
                                title="Privacy & Security"
                                items={[
                                    {
                                        type: 'double',
                                        label: 'Biometrics',
                                        value: "Use biometrics to unlock the app",
                                        subtitle: "Biometrics help you unlock this app faster",
                                    },
                                ]}
                            />

                            {/*<View className={"gap-4"}>
                <Text className={"font-semibold text-2xl"}>About</Text>
                <View className={"gap-y-0.5"}>
                  <Link href={"/profile/username"} className={"w-full px-5 py-6 bg-secondary-foreground/10 rounded-t-2xl rounded-b"}>
                    <View className={"flex flex-row justify-between items-center gap-x-4"}>
                      <View className={"flex-1 flex flex-row justify-between items-center"}>
                        <Text className={"h-full font-semibold text-xl"}>Username</Text>
                        <Text className={"h-full font-semibold text-xl"}>{profile?.username}</Text>
                      </View>
                      <View className={"flex flex-row items-center"}>
                        <Text className={"h-full text-secondary-foreground"}>
                          <LucideChevronRight color={cn("gray")} size={24} strokeWidth={3} />
                        </Text>
                      </View>
                    </View>
                  </Link>
                  <View className={"flex flex-row justify-between items-center gap-x-2 px-5 py-5 bg-secondary-foreground/10 rounded"}>
                    <View className={"flex-1 flex flex-row justify-between items-center"}>
                      <Text className={"font-semibold text-xl"}>Active Wallet</Text>
                      <Text className={"font-semibold text-xl"}>{shortenAddress(activeWallet?.publicKey.toJSON()!)}</Text>
                    </View>
                    <View className={"flex flex-row items-center"}>
                      <Text className={"text-secondary-foreground"}>
                        <LucideChevronRight color={cn("gray")} size={24} strokeWidth={3} />
                      </Text>
                    </View>
                  </View>
                  <Link href={"/profile/bio"} className={"w-full px-5 py-6 bg-secondary-foreground/10 rounded-b-2xl rounded-t"}>
                    <View className={"flex flex-row justify-between items-center gap-x-2"}>
                      <View className={"flex-1 flex flex-col justify-center items-start"}>
                        <Text className={cn("font-semibold text-xl")}>Bio</Text>
                        <Text className={"text-xl"} numberOfLines={1}>{profile?.bio || "You are a ..."}</Text>
                      </View>
                      <View className={"flex flex-row items-center"}>
                        <Text className={"h-full text-secondary-foreground"}>
                          <LucideChevronRight color={cn("gray")} size={24} strokeWidth={3} />
                        </Text>
                      </View>
                    </View>
                  </Link>
                </View>
              </View>*/}
                        </View>
                    </ScrollView>
                )}
            </PageBody>
        </PageContainer>
    )
}
