#include <cstring>
#include <cerrno>
#include <sys/personality.h>
#include <android/log.h>

#include "zygisk.hpp"

using zygisk::Api;
using zygisk::AppSpecializeArgs;
using zygisk::ServerSpecializeArgs;

#define LOG_TAG "SocFix"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static const char *TARGET_PKG = "com.vnlentertainment.socclassic";

static void disable_aslr() {
    int prev = personality(0xffffffff); // read current personality
    if (personality(prev | ADDR_NO_RANDOMIZE) == -1) {
        LOGE("personality(ADDR_NO_RANDOMIZE) failed: %s", strerror(errno));
    } else {
        LOGI("disabled ASLR for %s (prev personality 0x%x)", TARGET_PKG, prev);
    }
}

class SocFixModule : public zygisk::ModuleBase {
public:
    void onLoad(Api *api, JNIEnv *env) override {
        this->api = api;
        this->env = env;
    }

    void preAppSpecialize(AppSpecializeArgs *args) override {
        if (args->nice_name) {
            const char *process = env->GetStringUTFChars(args->nice_name, nullptr);
            if (process && strcmp(process, TARGET_PKG) == 0) {
                disable_aslr();
            }
            env->ReleaseStringUTFChars(args->nice_name, process);
        }

        // We don't hook anything, just let Zygisk unload us from memory afterward.
        api->setOption(zygisk::Option::DLCLOSE_MODULE_LIBRARY);
    }

private:
    Api *api;
    JNIEnv *env;
};

REGISTER_ZYGISK_MODULE(SocFixModule)
