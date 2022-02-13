<script setup lang="ts">
import { inject } from "vue"
import Resync from "@/resync"
import { checkPermission, Permission } from "../../backend/permission"
import type { PublicMember } from "$/room"
import SvgIcon from "../components/SvgIcon.vue"

const resync = inject<Resync>("resync")
if (!resync) throw new Error("resync injection failed")

const permissionToggle = (member: PublicMember, permission: Permission, defaultValue: boolean = false) => {
  const granted = defaultValue ? 
  checkPermission(resync.state.value.defaultPermission, permission)
   : checkPermission(member.permission, permission)

  if (granted) {
    resync.revokePermission(member.id, permission, defaultValue)
  } else {
    resync.grantPermission(member.id, permission, defaultValue)
  }
}

</script>

<template>
    <div id="memberlist" class="top-list left-0">
        <transition-group name="text-height">
          <div
            v-for="member in resync.state.value.members"
            :key="member.name"
            class="top-text"
          >
            <div
              v-if="checkPermission(member.permission, Permission.Host)"
              class="permissions"
            >
              <SvgIcon class="host" name="star" />
            </div>
            <div v-else class="permissions">
              <SvgIcon
                name="play_arrow"
                :class="{
                  enabled: checkPermission(member.permission, Permission.PlaybackControl),
                }"
                @click="permissionToggle(member, Permission.PlaybackControl)"
              />
              <SvgIcon
                name="playlist"
                :class="{
                  enabled: checkPermission(member.permission, Permission.ContentControl),
                }"
                @click="permissionToggle(member, Permission.ContentControl)"
              />
            </div>
            <div class="opacity-50">{{ member.name }}</div>
          </div>
        </transition-group>
        <div class="spacer" key=""></div>
        <div class="top-text">
          <div class="permissions">
              <SvgIcon
                name="play_arrow"
                :class="{
                  enabled: checkPermission(resync.state.value.defaultPermission, Permission.PlaybackControl),
                }"
                @click="permissionToggle(resync.state.value.members[0], Permission.PlaybackControl, true)"
              />
              <SvgIcon
                name="playlist"
                :class="{
                  enabled: checkPermission(resync.state.value.defaultPermission, Permission.ContentControl),
                }"
                @click="permissionToggle(resync.state.value.members[0], Permission.ContentControl, true)"
              />
          </div>
          <div class="opacity-50">default</div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.top-text {
  @apply h-5 mx-2 text-sm overflow-hidden;
  display: flex;
  align-items: center;
  // justify-content: end;

  .permissions {
    background: rgba(128, 128, 128, 0.25);
    border-radius: 10px;
    margin-right: 5px;
    display: flex;
    padding: 0 2.5px;
  }

  svg {
    height: 16px;
    width: 16px;
    opacity: 0.25;

    &.enabled {
      opacity: 1;
    }

    &.host {
      width: 32px;
      opacity: 1;
    }
  }
}
.top-list {
  position: absolute;
  padding-top: 0.5rem;
  top: 0;
}
.spacer {
  background-color: var(--clr-light);
  opacity: 0.5;
  width: 90%;
  height: 1px;
  margin: auto;
  @apply my-2;
}
.text-height {
  &-enter-active,
  &-leave-active {
    transition: all 500ms var(--ease-in-out-hard);
  }

  &-enter-from,
  &-leave-to {
    opacity: 0 !important;
    margin-left: 0px !important;
    height: 0px !important;
  }
}
</style>