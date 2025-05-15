// components/Section/Section.tsx
import React from 'react'
import {View} from 'react-native'
import {Text} from '~/components/ui/text'
import {Link} from 'expo-router'
import {LucideChevronRight} from 'lucide-react-native'
import {cn} from '~/lib/utils'

type BaseItemProps = {
  label: string
  rightIcon?: React.ReactNode
  href?: string
}

export type SingleRowItemProps = BaseItemProps & {
  type: 'single'
  value: string | number | React.ReactNode
}

export type DoubleRowItemProps = BaseItemProps & {
  type: 'double'
  value: string | number | React.ReactNode
  subtitle?: string | number | React.ReactNode
}

export type SectionItemProps = SingleRowItemProps | DoubleRowItemProps

type Props = {
  item: SingleRowItemProps | DoubleRowItemProps
  className?: string
}

type SectionProps = {
  title: string
  items: SectionItemProps[]
}

export function ListSection({title, items}: SectionProps) {
  return (
    <View className="gap-4">
      <Text className="font-semibold text-xl">{title}</Text>
      <View className="gap-y-0.5">
        {items.map((item, index) => (
          <SectionItem
            key={item.label}
            item={item}
            className={cn(
              index === 0 ? "rounded-t-2xl rounded-b" : "",
              index === items.length - 1 ? "rounded-b-2xl rounded-t" : "",
              index !== 0 && index !== items.length - 1 ? "rounded" : ""
            )}
          />
        ))}
      </View>
    </View>
  )
}

function SectionItem({item, className}: Props) {
  // const Container = item.href ? Link : View
  // const containerProps = item.href ? { href: item.href } : {}

  const content = (
    <View className="flex flex-row justify-between items-center gap-x-4">
      {/*<View className={cn(
        "flex-1 flex",
        item.type === 'single' ? "flex-row justify-between items-center" : "flex-col justify-center items-start"
      )}>
        <Text className="font-semibold text-xl">{item.label}</Text>

        {item.type === 'single' ? (
          <Text className="h-full font-semibold text-xl">{item.value}</Text>
        ) : (
          <Text className="text-xl" numberOfLines={1}>{item.value}</Text>
        )}
      </View>*/}

      {
        item.type === 'single'
          ? <View className={cn("flex-1 flex flex-row justify-between items-center")}>
            <Text className="font-normal text-base">{item.label}</Text>
            <Text className="h-full font-normal text-base">{item.value}</Text>
          </View>
          : <View className={cn("flex-1 flex flex-col justify-center items-start")}>
            <Text className="font-medium text-base">{item.label}</Text>
            <Text className="text-base" numberOfLines={1}>{item.value}</Text>
          </View>
      }
      <View className="flex flex-row items-center">
        {item.rightIcon || (
          <Text className="h-full text-secondary-foreground">
            <LucideChevronRight color={cn("gray")} size={24} strokeWidth={3}/>
          </Text>
        )}
      </View>
    </View>
  )

  if (item.href) {
    return (
      <Link
        // href={`/${item.href}`}
        href={{
          pathname: `${item.href}`,
        }}
        className={cn("w-full px-5 py-6 bg-secondary", className)}
      >
        {content}
      </Link>
    )
  }

  return (
    <View
      className={cn("w-full px-5 py-6 bg-secondary", className)}
    >
      {content}
    </View>
  )
}
