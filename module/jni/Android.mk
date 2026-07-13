LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := socfix
LOCAL_SRC_FILES := socfix.cpp
LOCAL_STATIC_LIBRARIES := libcxx
LOCAL_LDLIBS := -llog
include $(BUILD_SHARED_LIBRARY)

include jni/libcxx/Android.mk
